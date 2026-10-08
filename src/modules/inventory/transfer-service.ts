import { prisma } from "@/lib/db";
import { recordAuditEvent } from "@/lib/audit";
import { Result, ok, err } from "../core/result";
import { StockTransferStatus, AuditAction, Prisma } from "@prisma/client";

export interface CreateTransferItemInput {
  productId: string;
  quantity: number;
}

interface QuantRow {
  id: string;
  quantity: number | string;
  reservedQuantity?: number | string;
}

export interface CreateTransferInput {
  tenantId: string;
  actorId: string;
  transferNumber: string;
  sourceLocationId: string;
  destLocationId: string;
  notes?: string;
  items: CreateTransferItemInput[];
}

export interface DispatchTransferInput {
  tenantId: string;
  actorId: string;
  transferId: string;
}

export interface ReceiveTransferInput {
  tenantId: string;
  actorId: string;
  transferId: string;
  itemsReceived?: Array<{ productId: string; quantity: number }>;
}

export class TransferService {
  /**
   * 1. Create Inter-Branch Transfer in DRAFT status
   */
  static async createTransfer(input: CreateTransferInput): Promise<Result<{ transferId: string }, string>> {
    const { tenantId, actorId, transferNumber, sourceLocationId, destLocationId, notes, items } = input;

    if (sourceLocationId === destLocationId) {
      return err("Source and destination locations cannot be identical.");
    }

    if (!items || items.length === 0) {
      return err("Transfer requires at least one product line item.");
    }

    try {
      const transfer = await prisma.stockTransfer.create({
        data: {
          tenantId,
          transferNumber,
          sourceLocationId,
          destLocationId,
          notes,
          status: StockTransferStatus.DRAFT,
          lines: {
            create: items.map((i) => ({
              productId: i.productId,
              quantity: new Prisma.Decimal(i.quantity),
              receivedQty: new Prisma.Decimal(0),
            })),
          },
        },
      });

      await recordAuditEvent({
        tenantId,
        actorId,
        action: AuditAction.CREATE,
        entityType: "StockTransfer",
        entityId: transfer.id,
        afterState: { transferNumber, sourceLocationId, destLocationId, status: "DRAFT" },
      });

      return ok({ transferId: transfer.id });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return err(`Failed to create transfer: ${msg}`);
    }
  }

  /**
   * 2. Dispatch Transfer (Transit Out)
   * Deducts items from source location under row-level lock (SELECT FOR UPDATE)
   */
  static async dispatchTransfer(input: DispatchTransferInput): Promise<Result<{ status: string }, string>> {
    const { tenantId, actorId, transferId } = input;

    try {
      const updated = await prisma.$transaction(async (tx) => {
        const transfer = await tx.stockTransfer.findUnique({
          where: { id: transferId },
          include: { lines: true },
        });

        if (!transfer) throw new Error("Stock transfer not found.");
        if (transfer.status !== StockTransferStatus.DRAFT) {
          throw new Error(`Cannot dispatch transfer with status: ${transfer.status}`);
        }

        // Deduct source quants under pessimistic lock
        for (const line of transfer.lines) {
          const qtyNeeded = Number(line.quantity);

          const quants: QuantRow[] = await tx.$queryRaw`
            SELECT id, quantity, "reservedQuantity"
            FROM stock_quants
            WHERE "tenantId" = ${tenantId}
              AND "productId" = ${line.productId}
              AND "locationId" = ${transfer.sourceLocationId}
            FOR UPDATE
          `;

          const quant = quants[0];
          const availableQty = quant ? Number(quant.quantity) - Number(quant.reservedQuantity ?? 0) : 0;

          if (availableQty < qtyNeeded) {
            throw new Error(
              `Insufficient stock at source location for product ID ${line.productId}. Available: ${availableQty}, Required: ${qtyNeeded}`
            );
          }

          // Decrement source quant
          await tx.stockQuant.update({
            where: { id: quant.id },
            data: {
              quantity: { decrement: new Prisma.Decimal(qtyNeeded) },
              version: { increment: 1 },
            },
          });
        }

        // Mark transfer as IN_TRANSIT
        return await tx.stockTransfer.update({
          where: { id: transferId },
          data: {
            status: StockTransferStatus.IN_TRANSIT,
            dispatchedAt: new Date(),
          },
        });
      });

      await recordAuditEvent({
        tenantId,
        actorId,
        action: AuditAction.UPDATE,
        entityType: "StockTransfer",
        entityId: transferId,
        afterState: { status: "IN_TRANSIT", dispatchedAt: updated.dispatchedAt },
      });

      return ok({ status: "IN_TRANSIT" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return err(msg || "Failed to dispatch stock transfer.");
    }
  }

  /**
   * 3. Receive Transfer (Transit In)
   * Credits items to destination location under row-level lock
   */
  static async receiveTransfer(input: ReceiveTransferInput): Promise<Result<{ status: string }, string>> {
    const { tenantId, actorId, transferId, itemsReceived } = input;

    try {
      const updated = await prisma.$transaction(async (tx) => {
        const transfer = await tx.stockTransfer.findUnique({
          where: { id: transferId },
          include: { lines: true },
        });

        if (!transfer) throw new Error("Stock transfer not found.");
        if (transfer.status !== StockTransferStatus.IN_TRANSIT) {
          throw new Error(`Cannot receive transfer with status: ${transfer.status}`);
        }

        for (const line of transfer.lines) {
          const overrideItem = itemsReceived?.find((i) => i.productId === line.productId);
          const receivedQty = overrideItem ? overrideItem.quantity : Number(line.quantity);

          // Update destination stock quant under row-lock
          const destQuants: QuantRow[] = await tx.$queryRaw`
            SELECT id, quantity
            FROM stock_quants
            WHERE "tenantId" = ${tenantId}
              AND "productId" = ${line.productId}
              AND "locationId" = ${transfer.destLocationId}
            FOR UPDATE
          `;

          const destQuant = destQuants[0];

          if (destQuant) {
            await tx.stockQuant.update({
              where: { id: destQuant.id },
              data: {
                quantity: { increment: new Prisma.Decimal(receivedQty) },
                version: { increment: 1 },
              },
            });
          } else {
            await tx.stockQuant.create({
              data: {
                tenantId,
                productId: line.productId,
                locationId: transfer.destLocationId,
                quantity: new Prisma.Decimal(receivedQty),
                reservedQuantity: new Prisma.Decimal(0),
              },
            });
          }

          // Update received qty on line
          await tx.stockTransferLine.update({
            where: { id: line.id },
            data: {
              receivedQty: new Prisma.Decimal(receivedQty),
            },
          });
        }

        return await tx.stockTransfer.update({
          where: { id: transferId },
          data: {
            status: StockTransferStatus.COMPLETED,
            receivedAt: new Date(),
          },
        });
      });

      await recordAuditEvent({
        tenantId,
        actorId,
        action: AuditAction.UPDATE,
        entityType: "StockTransfer",
        entityId: transferId,
        afterState: { status: "COMPLETED", receivedAt: updated.receivedAt },
      });

      return ok({ status: "COMPLETED" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return err(msg || "Failed to receive stock transfer.");
    }
  }
}
