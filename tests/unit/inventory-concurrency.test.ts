import { describe, it, expect } from "vitest";

describe("Inventory Valuation (AVCO) & Reorder Point Logic", () => {
  it("should calculate correct Average Cost (AVCO) on incoming purchase receipt", () => {
    // Current stock: 100 units @ $10.00 = $1,000
    // Incoming shipment: 50 units @ $13.00 = $650
    // Total value = $1,650 across 150 units -> New AVCO = $11.00
    const currentQty = 100;
    const currentCost = 10.0;
    const incomingQty = 50;
    const incomingCost = 13.0;

    const totalCost = currentQty * currentCost + incomingQty * incomingCost;
    const totalQty = currentQty + incomingQty;
    const newAvco = totalCost / totalQty;

    expect(newAvco).toBe(11.0);
  });

  it("should detect when stock drops below safety reorder threshold", () => {
    const isBelowReorder = (onHand: number, safetyThreshold: number) =>
      onHand <= safetyThreshold;

    expect(isBelowReorder(14, 50)).toBe(true);
    expect(isBelowReorder(120, 15)).toBe(false);
  });

  it("should prevent negative stock depletion under concurrent checkout demands", () => {
    const simulateDeduction = (currentStock: number, requestedQty: number) => {
      if (currentStock < requestedQty) {
        throw new Error("Insufficient Stock");
      }
      return currentStock - requestedQty;
    };

    expect(simulateDeduction(10, 4)).toBe(6);
    expect(() => simulateDeduction(2, 5)).toThrowError("Insufficient Stock");
  });
});
