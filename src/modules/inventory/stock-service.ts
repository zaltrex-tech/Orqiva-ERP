import { prisma } from "@/lib/db";
import { recordAuditEvent } from "@/lib/audit";
import { Result, ok, err } from "../core/result";
import { StockMoveState, AuditAction } from "@prisma/client";

interface QuantRow {
  id: string;
  quantity: number | string;
  reservedQuantity: number | string;
  version?: number;
}

export interface TransferStockItem {
  productId: string;
  quantity: number;
}

export interface ExecuteStockTransferParams {
  tenantId: string;
  actorId: string;
  reference: string;
  sourceLocationId: string;
  destLocationId: string;
  originDocument?: string;
  items: TransferStockItem[];
}

export class StockService {
  /**
   * Executes an atomic stock transfer between locations.
   * Utilizes PostgreSQL row-level locks (FOR UPDATE) inside an interactive transaction
   * to guarantee zero overselling and eliminate race conditions under concurrent operations.
   */
  static async transferStock(
    params: ExecuteStockTransferParams
  ): Promise<Result<{ moveId: string }, string>> {
    const {
      tenantId,
      actorId,
      reference,
      sourceLocationId,
      destLocationId,
      originDocument,
      items,
    } = params;

    if (!items || items.length === 0) {
      return err("Stock transfer requires at least one product item.");
    }

    try {
      const result = await prisma.$transaction(
        async (tx) => {
          // 1. Create Stock Move in DRAFT state
          const stockMove = await tx.stockMove.create({
            data: {
              tenantId,
              reference,
              sourceLocationId,
              destLocationId,
              originDocument,
              createdById: actorId,
              state: StockMoveState.CONFIRMED,
            },
          });

          // 2. Process each item with Row-Level Locking on Source Quants
          for (const item of items) {
            if (item.quantity <= 0) {
              throw new Error(`Invalid transfer quantity: ${item.quantity}`);
            }

            // Find or lock the source quant
            // PostgreSQL pessimistic lock prevents parallel deductions on the same shelf
            const sourceQuants: QuantRow[] = await tx.$queryRaw`
              SELECT id, quantity, "reservedQuantity", version 
              FROM stock_quants 
              WHERE "tenantId" = ${tenantId} 
                AND "productId" = ${item.productId} 
                AND "locationId" = ${sourceLocationId} 
              FOR UPDATE
            `;

            const sourceQuant = sourceQuants[0];
            const currentQty = sourceQuant ? Number(sourceQuant.quantity) : 0;
            const reservedQty = sourceQuant ? Number(sourceQuant.reservedQuantity) : 0;
            const availableQty = currentQty - reservedQty;

            if (availableQty < item.quantity) {
              throw new Error(
                `Insufficient Stock: Product ${item.productId} only has ${availableQty} available at source location, but ${item.quantity} was requested.`
              );
            }

            // Decrement source location
            await tx.stockQuant.update({
              where: { id: sourceQuant.id },
              data: {
                quantity: { decrement: item.quantity },
                version: { increment: 1 },
              },
            });

            // Increment or Upsert destination location quant
            await tx.stockQuant.upsert({
              where: {
                tenantId_productId_locationId: {
                  tenantId,
                  productId: item.productId,
                  locationId: destLocationId,
                },
              },
              update: {
                quantity: { increment: item.quantity },
                version: { increment: 1 },
              },
              create: {
                tenantId,
                productId: item.productId,
                locationId: destLocationId,
                quantity: item.quantity,
                reservedQuantity: 0,
              },
            });

            // Record line
            await tx.stockMoveLine.create({
              data: {
                stockMoveId: stockMove.id,
                productId: item.productId,
                qtyDemand: item.quantity,
                qtyDone: item.quantity,
              },
            });
          }

          // Mark Stock Move as DONE
          await tx.stockMove.update({
            where: { id: stockMove.id },
            data: {
              state: StockMoveState.DONE,
              dateDone: new Date(),
            },
          });

          return stockMove;
        },
        {
          isolationLevel: "ReadCommitted",
          timeout: 15000,
        }
      );

      // 3. Append Immutable Audit Record
      await recordAuditEvent({
        tenantId,
        actorId,
        action: AuditAction.STOCK_ADJUSTMENT,
        entityType: "StockMove",
        entityId: result.id,
        afterState: {
          reference,
          sourceLocationId,
          destLocationId,
          itemCount: items.length,
        },
      });

      return ok({ moveId: result.id });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return err(msg || "Failed to complete concurrent stock transfer.");
    }
  }
}
