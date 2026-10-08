import { describe, it, expect } from "vitest";

describe("Phase 4 Invariants: AVCO (Weighted Average Cost) Formulas & Edge Cases", () => {
  /**
   * Reference AVCO formula implemented across Orqiva ERP:
   * newAvco = newQty > 0
   *   ? ((currentQty * currentCost) + (receivedQty * unitCost)) / newQty
   *   : unitCost;
   * with 4-decimal-place rounding.
   */
  function calculateAvco(
    currentQty: number,
    currentCost: number,
    receivedQty: number,
    receivedCost: number
  ): number {
    const newQty = currentQty + receivedQty;
    if (newQty <= 0) return receivedCost;
    const totalValue = currentQty * currentCost + receivedQty * receivedCost;
    const rawCost = totalValue / newQty;
    return Math.round(rawCost * 10000) / 10000;
  }

  it("should calculate exact AVCO for standard balanced replenishment", () => {
    // 100 units @ $10.00 = $1,000. Incoming: 100 units @ $20.00 = $2,000. Total = $3,000 / 200 = $15.00
    const avco = calculateAvco(100, 10.0, 100, 20.0);
    expect(avco).toBe(15.0);
  });

  it("should handle zero stock transition where initial warehouse quantity is zero", () => {
    // Current stock: 0 units @ $0.00. Incoming: 45 units @ $89.50.
    const avco = calculateAvco(0, 0.0, 45, 89.5);
    expect(avco).toBe(89.5);
  });

  it("should preserve fractional sub-penny pricing with 4 decimal places of precision", () => {
    // Current stock: 1,350 units @ $0.4525
    // Incoming: 820 units @ $0.6175
    // Total Value = (1350 * 0.4525) + (820 * 0.6175) = 610.875 + 506.35 = 1117.225
    // Total Qty = 2,170
    // Raw AVCO = 1117.225 / 2170 = 0.5148502304...
    // Rounded (4 decimals) = 0.5149
    const avco = calculateAvco(1350, 0.4525, 820, 0.6175);
    expect(avco).toBe(0.5149);
  });

  it("should maintain stability and numerical invariants with large enterprise volumes", () => {
    // 2,500,000 units @ $12.35
    // Incoming: 1,000,000 units @ $14.80
    // Total Value = 30,875,000 + 14,800,000 = 45,675,000
    // Total Qty = 3,500,000
    // Raw AVCO = 45,675,000 / 3,500,000 = 13.05
    const avco = calculateAvco(2500000, 12.35, 1000000, 14.8);
    expect(avco).toBe(13.05);
  });

  it("should calculate correct rolling AVCO over multiple successive receipt and sale cycles", () => {
    let stockQty = 0;
    let stockCost = 0.0;

    // Cycle 1: First purchase 100 units @ $50
    stockCost = calculateAvco(stockQty, stockCost, 100, 50.0);
    stockQty += 100;
    expect(stockCost).toBe(50.0);
    expect(stockQty).toBe(100);

    // Cycle 2: Sale of 60 units (sales reduce quantity, cost stays at current AVCO)
    stockQty -= 60;
    expect(stockQty).toBe(40);
    expect(stockCost).toBe(50.0);

    // Cycle 3: Second purchase 60 units @ $60
    stockCost = calculateAvco(stockQty, stockCost, 60, 60.0);
    stockQty += 60;
    // (40 * 50 + 60 * 60) / 100 = (2000 + 3600) / 100 = 56.0
    expect(stockCost).toBe(56.0);
    expect(stockQty).toBe(100);

    // Cycle 4: Third purchase 100 units @ $46
    stockCost = calculateAvco(stockQty, stockCost, 100, 46.0);
    stockQty += 100;
    // (100 * 56 + 100 * 46) / 200 = 10200 / 200 = 51.0
    expect(stockCost).toBe(51.0);
    expect(stockQty).toBe(200);
  });

  it("should maintain cost consistency when incoming receipt is identical to current AVCO", () => {
    const avco = calculateAvco(500, 32.75, 250, 32.75);
    expect(avco).toBe(32.75);
  });
});
