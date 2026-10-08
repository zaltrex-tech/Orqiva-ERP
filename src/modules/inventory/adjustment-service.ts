import { prisma } from "@/lib/db";
import { recordAuditEvent } from "@/lib/audit";
import { DoubleEntryEngine } from "../accounting/double-entry-engine";
import { Result, ok, err } from "../core/result";
import {
  AdjustmentReason,
  AdjustmentStatus,
  AuditAction,
  AccountType,
  JournalType,
  Prisma,
} from "@prisma/client";

export interface StockAdjustmentLineInput {
  productId: string;
  countedQuantity: number;
}

export interface CreateStockAdjustmentInput {
  tenantId: string;
  actorId: string;
  adjustmentNumber: string;
  locationId: string;
  reason: AdjustmentReason;
  notes?: string;
  lines: StockAdjustmentLineInput[];
}

export interface StockAdjustmentResult {
  adjustmentId: string;
  adjustmentNumber: string;
  status: string;
  totalCostVariance: number;
  journalEntryId?: string;
  linesCount: number;
}

export class AdjustmentService {
  /**
   * Executes Physical Stocktake Reconciliation (جرد فعلي)
   * 1. Locks stock quants under SELECT FOR UPDATE
   * 2. Recalculates exact inventory counts and cost variances
   * 3. Posts balanced double-entry accounting journal entries for inventory loss or gain
   * 4. Updates stock quants atomically
   */
  static async reconcileStock(
    input: CreateStockAdjustmentInput
  ): Promise<Result<StockAdjustmentResult, string>> {
    const { tenantId, actorId, adjustmentNumber, locationId, reason, notes, lines } = input;

    if (!lines || lines.length === 0) {
      return err("Stock adjustment requires at least one line item.");
    }

    try {
      // 1. Resolve Chart of Accounts for Inventory Adjustment
      const inventoryAssetAcc = await prisma.account.findFirst({
        where: { tenantId, code: "1030" }, // Finished Goods Inventory Asset
      });

      let inventoryLossAcc = await prisma.account.findFirst({
        where: { tenantId, code: "5010" }, // COGS / Inventory Loss
      });

      let inventoryGainAcc = await prisma.account.findFirst({
        where: { tenantId, code: "4010" }, // Commercial Revenue / Gain
      });

      const genJournal = await prisma.journal.findFirst({
        where: { tenantId, code: "GEN" },
      });

      if (!inventoryAssetAcc || !genJournal) {
        return err("Core accounting accounts (1030 or GEN journal) not initialized.");
      }

      // Execute atomic transaction under row-level lock
      const outcome = await prisma.$transaction(async (tx) => {
        let netFinancialVariance = 0;
        const calculatedLines: Array<{
          productId: string;
          systemQuantity: number;
          countedQuantity: number;
          varianceQuantity: number;
          unitCost: number;
          totalCostVariance: number;
        }> = [];

        for (const line of lines) {
          const product = await tx.product.findUnique({
            where: { id: line.productId },
          });

          if (!product) {
            throw new Error(`Product not found: ${line.productId}`);
          }

          const unitCost = Number(product.costPrice) || 0;

          // Lock source quant using SELECT FOR UPDATE
          const quants: any[] = await tx.$queryRaw`
            SELECT id, quantity, "reservedQuantity"
            FROM stock_quants
            WHERE "tenantId" = ${tenantId}
              AND "productId" = ${line.productId}
              AND "locationId" = ${locationId}
            FOR UPDATE
          `;

          const quant = quants[0];
          const systemQuantity = quant ? Number(quant.quantity) : 0;
          const countedQuantity = line.countedQuantity;
          const varianceQuantity = countedQuantity - systemQuantity;
          const totalCostVariance = Math.round(varianceQuantity * unitCost * 100) / 100;

          netFinancialVariance += totalCostVariance;

          calculatedLines.push({
            productId: line.productId,
            systemQuantity,
            countedQuantity,
            varianceQuantity,
            unitCost,
            totalCostVariance,
          });

          // Update stock quant to exactly match physical count
          if (quant) {
            await tx.stockQuant.update({
              where: { id: quant.id },
              data: {
                quantity: new Prisma.Decimal(countedQuantity),
                version: { increment: 1 },
              },
            });
          } else if (countedQuantity > 0) {
            await tx.stockQuant.create({
              data: {
                tenantId,
                productId: line.productId,
                locationId,
                quantity: new Prisma.Decimal(countedQuantity),
                reservedQuantity: new Prisma.Decimal(0),
              },
            });
          }
        }

        // Create the StockAdjustment record
        const adjustment = await tx.stockAdjustment.create({
          data: {
            tenantId,
            adjustmentNumber,
            locationId,
            reason,
            notes,
            status: AdjustmentStatus.POSTED,
            postedAt: new Date(),
            lines: {
              create: calculatedLines.map((cl) => ({
                productId: cl.productId,
                systemQuantity: new Prisma.Decimal(cl.systemQuantity),
                countedQuantity: new Prisma.Decimal(cl.countedQuantity),
                varianceQuantity: new Prisma.Decimal(cl.varianceQuantity),
                unitCost: new Prisma.Decimal(cl.unitCost),
                totalCostVariance: new Prisma.Decimal(cl.totalCostVariance),
              })),
            },
          },
        });

        return {
          adjustment,
          calculatedLines,
          netFinancialVariance: Math.round(netFinancialVariance * 100) / 100,
        };
      });

      // 2. Post Financial Balanced Journal Entry if financial variance exists
      let postedJournalEntryId: string | undefined = undefined;

      if (Math.abs(outcome.netFinancialVariance) >= 0.01) {
        const absVariance = Math.abs(outcome.netFinancialVariance);
        const ledgerItems = [];

        if (outcome.netFinancialVariance < 0) {
          // Inventory Loss / Shrinkage / Spoilage
          // Debit: Loss Expense (5010)
          // Credit: Inventory Asset (1030)
          ledgerItems.push({
            accountId: inventoryLossAcc!.id,
            label: `Inventory Adjustment Shrinkage/Loss [${adjustmentNumber} - ${reason}]`,
            debit: absVariance,
            credit: 0,
          });
          ledgerItems.push({
            accountId: inventoryAssetAcc.id,
            label: `Inventory Value Reduction [${adjustmentNumber}]`,
            debit: 0,
            credit: absVariance,
          });
        } else {
          // Inventory Gain / Found
          // Debit: Inventory Asset (1030)
          // Credit: Inventory Gain / Other Income (4010)
          ledgerItems.push({
            accountId: inventoryAssetAcc.id,
            label: `Inventory Value Upward Adjustment [${adjustmentNumber}]`,
            debit: absVariance,
            credit: 0,
          });
          ledgerItems.push({
            accountId: inventoryGainAcc!.id,
            label: `Inventory Adjustment Surplus Gain [${adjustmentNumber} - ${reason}]`,
            debit: 0,
            credit: absVariance,
          });
        }

        const postResult = await DoubleEntryEngine.postEntry({
          tenantId,
          actorId,
          journalId: genJournal.id,
          entryNumber: `ADJ-JE-${Date.now().toString().slice(-6)}`,
          reference: adjustmentNumber,
          narrative: `Physical Stocktake Reconciliation (${reason}): Net financial variance $${outcome.netFinancialVariance.toFixed(2)}`,
          items: ledgerItems,
        });

        if (postResult.success) {
          postedJournalEntryId = postResult.value.entryId;
          await prisma.stockAdjustment.update({
            where: { id: outcome.adjustment.id },
            data: { journalEntryId: postedJournalEntryId },
          });
        }
      }

      // 3. Record Audit Trail
      await recordAuditEvent({
        tenantId,
        actorId,
        action: AuditAction.STOCK_ADJUSTMENT,
        entityType: "StockAdjustment",
        entityId: outcome.adjustment.id,
        afterState: {
          adjustmentNumber,
          locationId,
          reason,
          netFinancialVariance: outcome.netFinancialVariance,
          journalEntryId: postedJournalEntryId,
        },
      });

      return ok({
        adjustmentId: outcome.adjustment.id,
        adjustmentNumber,
        status: "POSTED",
        totalCostVariance: outcome.netFinancialVariance,
        journalEntryId: postedJournalEntryId,
        linesCount: outcome.calculatedLines.length,
      });
    } catch (e: any) {
      return err(e.message || "Failed to execute stock adjustment reconciliation.");
    }
  }
}
