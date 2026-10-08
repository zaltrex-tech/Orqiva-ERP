import { describe, it, expect } from "vitest";

describe("Phase 4 Invariants: Row-Level Concurrency Locking & Stock Preservation", () => {
  /**
   * Concurrency Simulator:
   * Models PostgreSQL row-level pessimistic locking (SELECT ... FOR UPDATE)
   * where concurrent operations are strictly serialized against a shared stock quant.
   */
  class SimulatedStockQuant {
    private quantity: number;
    private version: number;
    private lockQueue: Promise<void> = Promise.resolve();

    constructor(initialQty: number) {
      this.quantity = initialQty;
      this.version = 1;
    }

    /**
     * Executes deduction within serialized transaction lock
     */
    async deductUnderLock(deductQty: number): Promise<{ success: boolean; remaining: number; version: number }> {
      // Serialize execution through mutex queue to model FOR UPDATE
      let unlock: () => void;
      const currentLock = new Promise<void>((resolve) => {
        unlock = resolve;
      });

      const previousLock = this.lockQueue;
      this.lockQueue = currentLock;

      await previousLock;

      try {
        if (this.quantity < deductQty) {
          throw new Error(`Insufficient stock: available ${this.quantity}, requested ${deductQty}`);
        }
        this.quantity -= deductQty;
        this.version += 1;
        return { success: true, remaining: this.quantity, version: this.version };
      } finally {
        unlock!();
      }
    }

    getQuantity(): number {
      return this.quantity;
    }

    getVersion(): number {
      return this.version;
    }
  }

  it("should prevent overselling when 50 concurrent checkout workers compete for limited stock", async () => {
    const initialUnits = 25;
    const quant = new SimulatedStockQuant(initialUnits);
    const workerCount = 50;
    const unitsPerWorker = 1;

    let successfulDeductions = 0;
    let failedDeductions = 0;

    // Launch all 50 workers concurrently
    const promises = Array.from({ length: workerCount }, async () => {
      try {
        await quant.deductUnderLock(unitsPerWorker);
        successfulDeductions++;
      } catch {
        failedDeductions++;
      }
    });

    await Promise.all(promises);

    // Invariant: Exactly 25 succeed and 25 fail; final quantity must be 0, never negative
    expect(successfulDeductions).toBe(25);
    expect(failedDeductions).toBe(25);
    expect(quant.getQuantity()).toBe(0);
    expect(quant.getVersion()).toBe(26); // 1 initial + 25 updates
  });

  it("should serialize staggered burst requests without race condition corruption", async () => {
    const quant = new SimulatedStockQuant(100);

    // 10 concurrent requests of varying sizes
    const demands = [10, 15, 5, 20, 10, 8, 12, 5, 5, 10]; // Sum = 100
    const promises = demands.map((qty) => quant.deductUnderLock(qty));

    const results = await Promise.all(promises);

    expect(results.length).toBe(10);
    expect(quant.getQuantity()).toBe(0);
    expect(quant.getVersion()).toBe(11);
  });

  it("should reject any deduction when stock reaches exact zero boundary", async () => {
    const quant = new SimulatedStockQuant(5);

    await quant.deductUnderLock(5);
    expect(quant.getQuantity()).toBe(0);

    // Next request must fail
    await expect(quant.deductUnderLock(1)).rejects.toThrow("Insufficient stock");
  });
});
