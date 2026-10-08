import { describe, it, expect } from "vitest";
import { hasPermission, UserRole } from "@/modules/auth/rbac";

describe("Granular Role-Based Access Control (RBAC)", () => {
  it("should allow Super Admin full operational and audit permissions", () => {
    expect(hasPermission("SUPER_ADMIN", "inventory:adjust_stock")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "accounting:view_ledger")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "pos:process_sale")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "audit:view_logs")).toBe(true);
  });

  it("should restrict Cashier from accessing General Ledger or Admin configs", () => {
    expect(hasPermission("CASHIER", "pos:process_sale")).toBe(true);
    expect(hasPermission("CASHIER", "accounting:view_ledger")).toBe(false);
    expect(hasPermission("CASHIER", "admin:system_config")).toBe(false);
    expect(hasPermission("CASHIER", "inventory:adjust_stock")).toBe(false);
  });

  it("should allow Accountant to view ledger and post journal entries but not adjust physical inventory directly", () => {
    expect(hasPermission("ACCOUNTANT", "accounting:view_ledger")).toBe(true);
    expect(hasPermission("ACCOUNTANT", "accounting:post_entry")).toBe(true);
    expect(hasPermission("ACCOUNTANT", "inventory:adjust_stock")).toBe(false);
  });

  it("should grant Auditor read-only visibility into financial and audit logs", () => {
    expect(hasPermission("AUDITOR", "audit:view_logs")).toBe(true);
    expect(hasPermission("AUDITOR", "accounting:view_ledger")).toBe(true);
    expect(hasPermission("AUDITOR", "accounting:post_entry")).toBe(false);
  });
});
