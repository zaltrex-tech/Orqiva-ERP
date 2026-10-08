import { prisma } from "@/lib/db";
import { recordAuditEvent } from "@/lib/audit";
import { DoubleEntryEngine } from "../accounting/double-entry-engine";
import { Result, ok, err } from "../core/result";
import { PurchaseOrderStatus, GoodsReceiptStatus, AuditAction, Prisma } from "@prisma/client";

export interface CreateVendorInput {
  tenantId: string;
  name: string;
  code: string;
  taxId?: string;
  email?: string;
  phone?: string;
  address?: string;
  paymentTerms?: string;
  currency?: string;
}

export interface PurchaseOrderItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
}

export interface CreatePurchaseOrderInput {
  tenantId: string;
  vendorId: string;
  warehouseId: string;
  orderNumber: string;
  items: PurchaseOrderItemInput[];
  notes?: string;
  orderDate?: Date;
  expectedDate?: Date;
}

export interface ReceiveGoodsItemInput {
  productId: string;
  quantityReceived: number;
  unitCost: number;
}

export interface ReceiveGoodsInput {
  tenantId: string;
  actorId: string;
  purchaseOrderId: string;
  locationId: string;
  receiptNumber?: string;
  items: ReceiveGoodsItemInput[];
  notes?: string;
}

export interface VendorBillInput {
  tenantId: string;
  actorId: string;
  purchaseOrderId: string;
  billReference: string;
}

export interface ThreeWayMatchResult {
  isMatched: boolean;
  status: "MATCHED" | "DISCREPANCY" | "PENDING_RECEIPT";
  poTotal: number;
  receivedTotal: number;
  billedTotal: number;
  discrepancies: string[];
}

export class PurchaseService {
  /**
   * 1. Register a new enterprise vendor/supplier
   */
  static async createVendor(input: CreateVendorInput): Promise<Result<{ id: string; name: string; code: string }, string>> {
    try {
      const existing = await prisma.vendor.findUnique({
        where: { tenantId_code: { tenantId: input.tenantId, code: input.code } },
      });

      if (existing) {
        return err(`Vendor with code ${input.code} already exists.`);
      }

      const vendor = await prisma.vendor.create({
        data: {
          tenantId: input.tenantId,
          name: input.name,
          code: input.code,
          taxId: input.taxId,
          email: input.email,
          phone: input.phone,
          address: input.address,
          paymentTerms: input.paymentTerms || "NET30",
          currency: input.currency || "USD",
        },
      });

      return ok({ id: vendor.id, name: vendor.name, code: vendor.code });
    } catch (e: any) {
      return err(`Failed to create vendor: ${e.message}`);
    }
  }

  /**
   * 2. Draft & Confirm a Purchase Order
   */
  static async createPurchaseOrder(input: CreatePurchaseOrderInput): Promise<Result<{ orderId: string; orderNumber: string }, string>> {
    if (!input.items || input.items.length === 0) {
      return err("Purchase Order requires at least one line item.");
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        let totalAmount = 0;
        let taxAmount = 0;

        for (const line of input.items) {
          const lineTax = (line.quantity * line.unitPrice * (line.taxRate || 0)) / 100;
          const lineSubtotal = line.quantity * line.unitPrice + lineTax;
          totalAmount += lineSubtotal;
          taxAmount += lineTax;
        }

        const po = await tx.purchaseOrder.create({
          data: {
            tenantId: input.tenantId,
            vendorId: input.vendorId,
            warehouseId: input.warehouseId,
            orderNumber: input.orderNumber,
            status: PurchaseOrderStatus.CONFIRMED,
            totalAmount: new Prisma.Decimal(totalAmount),
            taxAmount: new Prisma.Decimal(taxAmount),
            notes: input.notes,
            orderDate: input.orderDate || new Date(),
            expectedDate: input.expectedDate,
            items: {
              create: input.items.map((line) => {
                const lineTax = (line.quantity * line.unitPrice * (line.taxRate || 0)) / 100;
                const lineSubtotal = line.quantity * line.unitPrice + lineTax;
                return {
                  productId: line.productId,
                  quantity: new Prisma.Decimal(line.quantity),
                  unitPrice: new Prisma.Decimal(line.unitPrice),
                  taxRate: new Prisma.Decimal(line.taxRate || 0),
                  subtotal: new Prisma.Decimal(lineSubtotal),
                  receivedQuantity: new Prisma.Decimal(0),
                };
              }),
            },
          },
        });

        return { orderId: po.id, orderNumber: po.orderNumber };
      });

      return ok(result);
    } catch (e: any) {
      return err(`Failed to create purchase order: ${e.message}`);
    }
  }

  /**
   * 3. Receive Goods (Goods Receipt) & Increment Inventory Quants (AVCO Valuation)
   * Protected with PostgreSQL row-level locking to guarantee stock integrity
   */
  static async receiveGoods(input: ReceiveGoodsInput): Promise<Result<{ receiptId: string; receiptNumber: string }, string>> {
    const { tenantId, actorId, purchaseOrderId, locationId, items } = input;

    if (!items || items.length === 0) {
      return err("Goods receipt requires at least one item.");
    }

    try {
      const receiptResult = await prisma.$transaction(async (tx) => {
        const po = await tx.purchaseOrder.findUnique({
          where: { id: purchaseOrderId },
          include: { items: true },
        });

        if (!po) {
          throw new Error("Purchase Order not found.");
        }

        const receiptNumber = input.receiptNumber || `GR-${Date.now().toString().slice(-6)}`;

        // Create Goods Receipt
        const goodsReceipt = await tx.goodsReceipt.create({
          data: {
            tenantId,
            purchaseOrderId,
            locationId,
            receiptNumber,
            status: GoodsReceiptStatus.COMPLETED,
            receivedById: actorId,
            notes: input.notes,
          },
        });

        // Process each received item under row-lock
        for (const item of items) {
          // Lock or find stock quant
          const existingQuant = await tx.stockQuant.findUnique({
            where: {
              tenantId_productId_locationId: {
                tenantId,
                productId: item.productId,
                locationId,
              },
            },
          });

          const currentQty = existingQuant ? Number(existingQuant.quantity) : 0;
          const newQty = currentQty + item.quantityReceived;

          // Fetch product for AVCO recalculation
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });

          if (product) {
            const currentCost = Number(product.costPrice);
            // AVCO: ((currentQty * currentCost) + (receivedQty * unitCost)) / (currentQty + receivedQty)
            const newAvcoCost =
              newQty > 0
                ? (currentQty * currentCost + item.quantityReceived * item.unitCost) / newQty
                : item.unitCost;

            // Update Product AVCO Cost
            await tx.product.update({
              where: { id: item.productId },
              data: {
                costPrice: new Prisma.Decimal(Math.round(newAvcoCost * 10000) / 10000),
              },
            });
          }

          // Update or create StockQuant
          if (existingQuant) {
            await tx.stockQuant.update({
              where: { id: existingQuant.id },
              data: {
                quantity: new Prisma.Decimal(newQty),
                version: { increment: 1 },
              },
            });
          } else {
            await tx.stockQuant.create({
              data: {
                tenantId,
                productId: item.productId,
                locationId,
                quantity: new Prisma.Decimal(item.quantityReceived),
              },
            });
          }

          // Create receipt line item
          await tx.goodsReceiptItem.create({
            data: {
              goodsReceiptId: goodsReceipt.id,
              productId: item.productId,
              quantityReceived: new Prisma.Decimal(item.quantityReceived),
              unitCost: new Prisma.Decimal(item.unitCost),
            },
          });

          // Increment PO line item receivedQuantity
          const poLine = po.items.find((i) => i.productId === item.productId);
          if (poLine) {
            const updatedReceived = Number(poLine.receivedQuantity) + item.quantityReceived;
            await tx.purchaseOrderItem.update({
              where: { id: poLine.id },
              data: {
                receivedQuantity: new Prisma.Decimal(updatedReceived),
              },
            });
          }
        }

        // Update PO state to RECEIVED
        await tx.purchaseOrder.update({
          where: { id: purchaseOrderId },
          data: { status: PurchaseOrderStatus.RECEIVED },
        });

        return { receiptId: goodsReceipt.id, receiptNumber };
      });

      // Immutable Audit Trail
      await recordAuditEvent({
        tenantId,
        actorId,
        action: AuditAction.STOCK_ADJUSTMENT,
        entityType: "GoodsReceipt",
        entityId: receiptResult.receiptId,
        metadata: {
          purchaseOrderId,
          receiptNumber: receiptResult.receiptNumber,
          itemsCount: items.length,
        },
      });

      return ok(receiptResult);
    } catch (e: any) {
      return err(`Failed to receive goods: ${e.message}`);
    }
  }

  /**
   * 4. Perform Automated 3-Way Matching (PO vs. Goods Receipt vs. Vendor Bill)
   */
  static async threeWayMatch(purchaseOrderId: string): Promise<Result<ThreeWayMatchResult, string>> {
    try {
      const po = await prisma.purchaseOrder.findUnique({
        where: { id: purchaseOrderId },
        include: {
          items: true,
          receipts: {
            include: { items: true },
          },
        },
      });

      if (!po) {
        return err("Purchase Order not found.");
      }

      let poTotal = Number(po.totalAmount);
      let receivedTotal = 0;
      const discrepancies: string[] = [];

      for (const poLine of po.items) {
        const ordered = Number(poLine.quantity);
        const received = Number(poLine.receivedQuantity);
        const price = Number(poLine.unitPrice);
        const taxRate = Number(poLine.taxRate);

        const lineTax = (received * price * taxRate) / 100;
        receivedTotal += received * price + lineTax;

        if (received < ordered) {
          discrepancies.push(
            `Product ${poLine.productId}: Ordered ${ordered}, but only ${received} received.`
          );
        } else if (received > ordered) {
          discrepancies.push(
            `Product ${poLine.productId}: Over-delivered! Ordered ${ordered}, received ${received}.`
          );
        }
      }

      const isMatched = discrepancies.length === 0 && receivedTotal > 0;
      const status: ThreeWayMatchResult["status"] =
        po.receipts.length === 0
          ? "PENDING_RECEIPT"
          : isMatched
          ? "MATCHED"
          : "DISCREPANCY";

      return ok({
        isMatched,
        status,
        poTotal,
        receivedTotal,
        billedTotal: po.status === PurchaseOrderStatus.BILLED ? poTotal : 0,
        discrepancies,
      });
    } catch (e: any) {
      return err(`3-Way matching verification failed: ${e.message}`);
    }
  }

  /**
   * 5. Generate & Post Vendor Bill (Double-Entry Invariant: Debit Inventory Asset, Credit Accounts Payable)
   */
  static async generateVendorBill(input: VendorBillInput): Promise<Result<{ billEntryId: string }, string>> {
    const { tenantId, actorId, purchaseOrderId, billReference } = input;

    try {
      // 1. Run 3-Way Match Verification first
      const matchRes = await this.threeWayMatch(purchaseOrderId);
      if (!matchRes.success) {
        return err(matchRes.error);
      }

      if (matchRes.value.status === "PENDING_RECEIPT") {
        return err("Cannot generate Vendor Bill: No goods have been received yet.");
      }

      const po = await prisma.purchaseOrder.findUnique({
        where: { id: purchaseOrderId },
        include: { vendor: true },
      });

      if (!po) return err("Purchase Order not found.");
      if (po.status === PurchaseOrderStatus.BILLED) {
        return err("This purchase order has already been billed.");
      }

      const billTotal = Number(po.totalAmount);
      const taxAmount = Number(po.taxAmount);
      const netInventoryAsset = billTotal - taxAmount;

      // 2. Resolve Chart of Accounts
      const inventoryAssetAcc = await prisma.account.findFirst({
        where: { tenantId, code: "1030" }, // Finished Goods Inventory Asset
      });

      const accountsPayableAcc = await prisma.account.findFirst({
        where: { tenantId, code: "2010" }, // Accounts Payable (Vendors)
      });

      const vatPayableAcc = await prisma.account.findFirst({
        where: { tenantId, code: "2020" }, // Sales Tax / VAT
      });

      const billJournal = await prisma.journal.findFirst({
        where: { tenantId, code: "BILL" }, // Vendor Bills Journal
      });

      if (!inventoryAssetAcc || !accountsPayableAcc || !billJournal) {
        return err("Core accounting master data (Accounts 1030, 2010, or Journal BILL) not initialized.");
      }

      // 3. Construct Balanced Double-Entry Journal Items
      const ledgerItems = [];

      if (taxAmount > 0 && vatPayableAcc) {
        ledgerItems.push({
          accountId: inventoryAssetAcc.id,
          label: `Inventory Inbound Asset [${po.orderNumber}]`,
          debit: netInventoryAsset,
          credit: 0,
        });
        ledgerItems.push({
          accountId: vatPayableAcc.id,
          label: `Input VAT Deductible [${po.orderNumber}]`,
          debit: taxAmount,
          credit: 0,
        });
      } else {
        ledgerItems.push({
          accountId: inventoryAssetAcc.id,
          label: `Inventory Inbound Asset [${po.orderNumber}]`,
          debit: billTotal,
          credit: 0,
        });
      }

      // Offsetting Credit: Accounts Payable (الموردين)
      ledgerItems.push({
        accountId: accountsPayableAcc.id,
        label: `Vendor Payable Liability: ${po.vendor.name} [${billReference}]`,
        debit: 0,
        credit: billTotal,
      });

      // 4. Post Atomic Journal Entry via DoubleEntryEngine
      const postResult = await DoubleEntryEngine.postEntry({
        tenantId,
        actorId,
        journalId: billJournal.id,
        entryNumber: `BILL-${Date.now().toString().slice(-6)}`,
        reference: billReference,
        narrative: `Vendor Bill for PO #${po.orderNumber} (${po.vendor.name})`,
        items: ledgerItems,
      });

      if (!postResult.success) {
        return err(`Ledger posting failed: ${postResult.error}`);
      }

      // 5. Update PO Status & Vendor Outstanding Balance
      await prisma.$transaction(async (tx) => {
        await tx.purchaseOrder.update({
          where: { id: purchaseOrderId },
          data: { status: PurchaseOrderStatus.BILLED },
        });

        await tx.vendor.update({
          where: { id: po.vendorId },
          data: {
            balance: { increment: new Prisma.Decimal(billTotal) },
          },
        });
      });

      return ok({ billEntryId: postResult.value.entryId });
    } catch (e: any) {
      return err(`Vendor billing failed: ${e.message}`);
    }
  }
}
