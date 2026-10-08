import crypto from "crypto";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { recordAuditEvent } from "@/lib/audit";
import { Result, ok, err } from "../core/result";
import { Prisma, AuditAction } from "@prisma/client";

export interface TLVField {
  tag: number;
  value: string;
}

export interface EInvoicePayload {
  tenantId: string;
  invoiceNumber: string;
  issueDate?: Date;
  sellerName: string;
  vatNumber: string;
  customerName?: string;
  customerVat?: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  posOrderId?: string;
}

export interface EInvoiceResult {
  id: string;
  invoiceNumber: string;
  tlvBase64: string;
  qrDataUrl: string;
  invoiceHash: string;
  previousHash: string;
  issueDate: string;
}

export interface ChainVerificationResult {
  isValid: boolean;
  totalAudited: number;
  error?: string;
  corruptedInvoiceNumber?: string;
}

export class EInvoiceService {
  public static readonly GENESIS_HASH = "0".repeat(64);

  /**
   * 1. Standard Tag-Length-Value (TLV) Encoder
   * Tag 1: Seller's Name
   * Tag 2: VAT Registration Number
   * Tag 3: Time Stamp (ISO 8601)
   * Tag 4: Invoice Total (with VAT)
   * Tag 5: VAT Total
   */
  static encodeTLV(fields: TLVField[]): string {
    const buffers: Buffer[] = [];

    for (const field of fields) {
      const tagBuffer = Buffer.from([field.tag]);
      const valueBuffer = Buffer.from(field.value, "utf8");
      const lengthBuffer = Buffer.from([valueBuffer.length]);

      buffers.push(tagBuffer, lengthBuffer, valueBuffer);
    }

    return Buffer.concat(buffers).toString("base64");
  }

  /**
   * Decodes a Base64-encoded TLV byte stream back into tag/value pairs
   */
  static decodeTLV(base64Str: string): TLVField[] {
    const buf = Buffer.from(base64Str, "base64");
    const fields: TLVField[] = [];
    let offset = 0;

    while (offset < buf.length) {
      const tag = buf.readUInt8(offset);
      offset += 1;
      const len = buf.readUInt8(offset);
      offset += 1;
      const valBuf = buf.subarray(offset, offset + len);
      offset += len;
      fields.push({
        tag,
        value: valBuf.toString("utf8"),
      });
    }

    return fields;
  }

  /**
   * Builds canonical payload string for SHA-256 hash computation
   */
  static buildCanonicalPayload(
    previousHash: string,
    invoiceNumber: string,
    issueDate: Date,
    sellerName: string,
    vatNumber: string,
    subtotal: number,
    taxAmount: number,
    totalAmount: number
  ): string {
    return [
      previousHash,
      invoiceNumber,
      issueDate.toISOString(),
      sellerName.trim(),
      vatNumber.trim(),
      subtotal.toFixed(2),
      taxAmount.toFixed(2),
      totalAmount.toFixed(2),
    ].join("|");
  }

  /**
   * Computes SHA-256 hash of previous hash + invoice content
   */
  static computeInvoiceHash(
    previousHash: string,
    invoiceNumber: string,
    issueDate: Date,
    sellerName: string,
    vatNumber: string,
    subtotal: number,
    taxAmount: number,
    totalAmount: number
  ): string {
    const canonical = this.buildCanonicalPayload(
      previousHash,
      invoiceNumber,
      issueDate,
      sellerName,
      vatNumber,
      subtotal,
      taxAmount,
      totalAmount
    );
    return crypto.createHash("sha256").update(canonical).digest("hex");
  }

  /**
   * Generates a fully compliant E-Invoice with Base64 TLV QR Code & Cryptographic Chaining
   */
  static async generateInvoice(payload: EInvoicePayload): Promise<Result<EInvoiceResult, string>> {
    const {
      tenantId,
      invoiceNumber,
      sellerName,
      vatNumber,
      customerName,
      customerVat,
      subtotal,
      taxAmount,
      totalAmount,
      posOrderId,
    } = payload;

    const issueDate = payload.issueDate || new Date();

    try {
      // 1. Resolve Previous Hash from latest invoice for cryptographic chaining
      const latestInvoice = await prisma.eInvoice.findFirst({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
      });

      const previousHash = latestInvoice ? latestInvoice.invoiceHash : this.GENESIS_HASH;

      // 2. Compute Immutable SHA-256 Hash
      const invoiceHash = this.computeInvoiceHash(
        previousHash,
        invoiceNumber,
        issueDate,
        sellerName,
        vatNumber,
        subtotal,
        taxAmount,
        totalAmount
      );

      // 3. Generate 5-Tag TLV Payload
      const tlvFields: TLVField[] = [
        { tag: 1, value: sellerName },
        { tag: 2, value: vatNumber },
        { tag: 3, value: issueDate.toISOString() },
        { tag: 4, value: totalAmount.toFixed(2) },
        { tag: 5, value: taxAmount.toFixed(2) },
      ];

      const tlvBase64 = this.encodeTLV(tlvFields);

      // 4. Generate QR Code Data URL
      const qrDataUrl = await QRCode.toDataURL(tlvBase64, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 250,
      });

      // 5. Persist EInvoice in atomic database transaction
      const record = await prisma.$transaction(async (tx) => {
        const created = await tx.eInvoice.create({
          data: {
            tenantId,
            invoiceNumber,
            issueDate,
            sellerName,
            vatNumber,
            customerName,
            customerVat,
            subtotal: new Prisma.Decimal(subtotal),
            taxAmount: new Prisma.Decimal(taxAmount),
            totalAmount: new Prisma.Decimal(totalAmount),
            previousHash,
            invoiceHash,
            tlvBase64,
            posOrderId,
          },
        });

        // Update PosOrder if linked
        if (posOrderId) {
          await tx.posOrder.update({
            where: { id: posOrderId },
            data: {
              qrCode: tlvBase64,
              invoiceHash,
              previousHash,
            },
          });
        }

        return created;
      });

      await recordAuditEvent({
        tenantId,
        action: AuditAction.CREATE,
        entityType: "EInvoice",
        entityId: record.id,
        afterState: {
          invoiceNumber,
          invoiceHash,
          previousHash,
          totalAmount,
        },
      });

      return ok({
        id: record.id,
        invoiceNumber: record.invoiceNumber,
        tlvBase64,
        qrDataUrl,
        invoiceHash,
        previousHash,
        issueDate: issueDate.toISOString(),
      });
    } catch (e: any) {
      return err(`Failed to generate compliant e-invoice: ${e.message}`);
    }
  }

  /**
   * Verifies the cryptographic chain across all historical invoices for a tenant.
   * Confirms zero tamper, deletion, or modification in the audit ledger.
   */
  static async verifyInvoiceChain(tenantId: string): Promise<ChainVerificationResult> {
    const invoices = await prisma.eInvoice.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
    });

    if (invoices.length === 0) {
      return { isValid: true, totalAudited: 0 };
    }

    let expectedPreviousHash = this.GENESIS_HASH;

    for (let i = 0; i < invoices.length; i++) {
      const inv = invoices[i];

      // 1. Verify chain continuity
      if (inv.previousHash !== expectedPreviousHash) {
        return {
          isValid: false,
          totalAudited: i,
          corruptedInvoiceNumber: inv.invoiceNumber,
          error: `Chain broken at invoice #${inv.invoiceNumber}. Expected previous hash: ${expectedPreviousHash}, but found: ${inv.previousHash}`,
        };
      }

      // 2. Re-compute SHA-256 hash
      const recomputedHash = this.computeInvoiceHash(
        inv.previousHash,
        inv.invoiceNumber,
        inv.issueDate,
        inv.sellerName,
        inv.vatNumber,
        Number(inv.subtotal),
        Number(inv.taxAmount),
        Number(inv.totalAmount)
      );

      if (recomputedHash !== inv.invoiceHash) {
        return {
          isValid: false,
          totalAudited: i,
          corruptedInvoiceNumber: inv.invoiceNumber,
          error: `Payload tampering detected on invoice #${inv.invoiceNumber}. Stored hash: ${inv.invoiceHash}, Recomputed hash: ${recomputedHash}`,
        };
      }

      expectedPreviousHash = inv.invoiceHash;
    }

    return {
      isValid: true,
      totalAudited: invoices.length,
    };
  }

  /**
   * Generates a QR Code Data URL directly from an arbitrary string or TLV base64
   */
  static async generateQRDataUrl(text: string): Promise<string> {
    return QRCode.toDataURL(text, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 250,
    });
  }
}
