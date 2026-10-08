import { prisma } from "@/lib/db";
import { recordAuditEvent } from "@/lib/audit";
import { Result, ok, err } from "../core/result";
import { StockService } from "../inventory/stock-service";
import { DoubleEntryEngine } from "../accounting/double-entry-engine";
import { EInvoiceService } from "../compliance/e-invoice-service";
import { PosSessionState, AuditAction } from "@prisma/client";

export interface PosCheckoutItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
}

export interface ProcessPosOrderParams {
  tenantId: string;
  cashierId: string;
  sessionId: string;
  orderNumber: string;
  stockLocationId: string;
  customerLocationId: string;
  paymentMethod: "CASH" | "CARD";
  items: PosCheckoutItem[];
}

export class PosService {
  /**
   * Processes POS Order with Saga-like coordination across Domains:
   * 1. Validates open Cashier session
   * 2. Persists POS Order & Lines
   * 3. Triggers concurrent Inventory stock deduction with row-level locking
   * 4. Updates session sales tally
   */
  static async processOrder(params: ProcessPosOrderParams): Promise<Result<{ orderId: string }, string>> {
    const {
      tenantId,
      cashierId,
      sessionId,
      orderNumber,
      stockLocationId,
      customerLocationId,
      paymentMethod,
      items,
    } = params;

    if (!items || items.length === 0) {
      return err("Cannot process empty POS order.");
    }

    // 1. Verify active session
    const session = await prisma.posSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.state !== PosSessionState.OPENED) {
      return err("Active opened POS session required to conduct sales transactions.");
    }

    let subtotal = 0;
    let taxTotal = 0;

    for (const item of items) {
      subtotal += item.quantity * item.unitPrice;
      taxTotal += item.taxAmount;
    }

    const totalAmount = subtotal + taxTotal;

    try {
      // 2. Perform Inventory Deduction first to ensure stock availability under lock
      const transferRes = await StockService.transferStock({
        tenantId: session.tenantId,
        actorId: session.cashierId,
        reference: `POS-SALE/${orderNumber}`,
        sourceLocationId: stockLocationId,
        destLocationId: customerLocationId,
        originDocument: orderNumber,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });

      if (!transferRes.success) {
        return err(`POS Stock Depletion Failed: ${transferRes.error}`);
      }

      // 3. Commit POS Order and update session metrics
      const order = await prisma.$transaction(async (tx) => {
        const createdOrder = await tx.posOrder.create({
          data: {
            tenantId: session.tenantId,
            sessionId,
            orderNumber,
            totalAmount,
            taxAmount: taxTotal,
            paymentMethod,
            lines: {
              create: items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                taxAmount: item.taxAmount,
                subtotal: item.quantity * item.unitPrice,
              })),
            },
          },
        });

        await tx.posSession.update({
          where: { id: sessionId },
          data: {
            totalSales: { increment: totalAmount },
          },
        });

        return createdOrder;
      });

      // 4. Generate compliant fiscal e-invoice with TLV QR and cryptographic hash chaining
      const invoiceResult = await EInvoiceService.generateInvoice({
        tenantId: session.tenantId,
        invoiceNumber: orderNumber,
        sellerName: "Orqiva Enterprise Solutions Ltd",
        vatNumber: "300492817200003",
        subtotal,
        taxAmount: taxTotal,
        totalAmount,
        posOrderId: order.id,
      });

      return ok({
        orderId: order.id,
        orderNumber,
        qrCode: invoiceResult.success ? invoiceResult.value.tlvBase64 : undefined,
        qrDataUrl: invoiceResult.success ? invoiceResult.value.qrDataUrl : undefined,
        invoiceHash: invoiceResult.success ? invoiceResult.value.invoiceHash : undefined,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return err(msg || "Failed to process POS checkout transaction.");
    }
  }
}
