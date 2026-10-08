import { describe, it, expect } from "vitest";
import { EInvoiceService, TLVField } from "@/modules/compliance/e-invoice-service";

describe("Phase 4 Invariants: ZATCA TLV QR Encoding & Cryptographic Hash Chaining", () => {
  it("should correctly calculate byte lengths for UTF-8 multi-byte Arabic strings in TLV fields", () => {
    const arabicSeller = "شركة أوركيفا لحلول تخطيط الموارد المتقدمة (ذ.م.م)";
    // In UTF-8, Arabic characters are 2 bytes each, plus spaces and parentheses
    const byteLength = Buffer.byteLength(arabicSeller, "utf-8");
    const charLength = arabicSeller.length;

    expect(byteLength).toBeGreaterThan(charLength);

    const fields: TLVField[] = [
      { tag: 1, value: arabicSeller },
      { tag: 2, value: "310998877600003" },
      { tag: 3, value: "2026-10-08T20:30:00Z" },
      { tag: 4, value: "2300.00" },
      { tag: 5, value: "300.00" },
    ];

    const encodedBase64 = EInvoiceService.encodeTLV(fields);
    const decoded = EInvoiceService.decodeTLV(encodedBase64);

    expect(decoded[0].value).toBe(arabicSeller);
    expect(decoded[0].tag).toBe(1);
    expect(Buffer.byteLength(decoded[0].value, "utf-8")).toBe(byteLength);
  });

  it("should accurately format and preserve ISO-8601 timestamps without timezone drift", () => {
    const timestamp = "2026-10-08T15:45:00.000Z";
    const fields: TLVField[] = [
      { tag: 1, value: "Orqiva Flagship Branch" },
      { tag: 2, value: "310000000000003" },
      { tag: 3, value: timestamp },
      { tag: 4, value: "575.00" },
      { tag: 5, value: "75.00" },
    ];

    const encoded = EInvoiceService.encodeTLV(fields);
    const decoded = EInvoiceService.decodeTLV(encoded);

    expect(decoded[2].value).toBe(timestamp);
  });

  it("should generate deterministic, collision-resistant SHA-256 canonical invoice hash", () => {
    const genesis = EInvoiceService.GENESIS_HASH;
    const invoiceDate = new Date("2026-10-08T14:00:00Z");

    const hashA = EInvoiceService.computeInvoiceHash(
      genesis,
      "INV-ORQ-2026-9999",
      invoiceDate,
      "شركة أوركيفا العالمية",
      "310123456700003",
      2000.0,
      300.0,
      2300.0
    );

    const hashB = EInvoiceService.computeInvoiceHash(
      genesis,
      "INV-ORQ-2026-9999",
      invoiceDate,
      "شركة أوركيفا العالمية",
      "310123456700003",
      2000.0,
      300.0,
      2300.0
    );

    expect(hashA).toBe(hashB);
    expect(hashA).toMatch(/^[a-f0-9]{64}$/); // Exact 64 hex characters
  });

  it("should detect hash divergence upon any tampering with Arabic textual metadata", () => {
    const genesis = EInvoiceService.GENESIS_HASH;
    const date = new Date("2026-10-08T14:00:00Z");

    const legitimateHash = EInvoiceService.computeInvoiceHash(
      genesis,
      "INV-001",
      date,
      "شركة أوركيفا للبرمجيات",
      "310123456700003",
      1000.0,
      150.0,
      1150.0
    );

    // Tampered: single letter altered in Arabic seller name (ب to ت)
    const tamperedHash = EInvoiceService.computeInvoiceHash(
      genesis,
      "INV-001",
      date,
      "شركة أوركيفا للترمجيات",
      "310123456700003",
      1000.0,
      150.0,
      1150.0
    );

    expect(legitimateHash).not.toBe(tamperedHash);
  });

  it("should verify immutable ledger hash chaining across sequential transactions", () => {
    const chain: string[] = [EInvoiceService.GENESIS_HASH];
    const invoices = [
      { num: "INV-01", sub: 100, vat: 15, tot: 115 },
      { num: "INV-02", sub: 200, vat: 30, tot: 230 },
      { num: "INV-03", sub: 300, vat: 45, tot: 345 },
    ];

    for (let i = 0; i < invoices.length; i++) {
      const prevHash = chain[i];
      const newHash = EInvoiceService.computeInvoiceHash(
        prevHash,
        invoices[i].num,
        new Date(`2026-10-08T1${i}:00:00Z`),
        "Orqiva ERP",
        "310123456700003",
        invoices[i].sub,
        invoices[i].vat,
        invoices[i].tot
      );
      chain.push(newHash);
    }

    expect(chain.length).toBe(4);
    // Invariant: every block in the chain is uniquely derived from the preceding block
    expect(chain[1]).not.toBe(chain[0]);
    expect(chain[2]).not.toBe(chain[1]);
    expect(chain[3]).not.toBe(chain[2]);
  });
});
