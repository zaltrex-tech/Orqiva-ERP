export type UserRole =
  | "SUPER_ADMIN"
  | "ACCOUNTANT"
  | "INVENTORY_MANAGER"
  | "CASHIER"
  | "HR_MANAGER"
  | "AUDITOR";

export type Permission =
  // Inventory
  | "inventory:view"
  | "inventory:create_move"
  | "inventory:validate_move"
  | "inventory:adjust_stock"
  | "inventory:view_valuation"
  // POS
  | "pos:open_session"
  | "pos:close_session"
  | "pos:process_sale"
  | "pos:refund"
  // Accounting
  | "accounting:view_ledger"
  | "accounting:post_entry"
  | "accounting:reconcile"
  | "accounting:financial_reports"
  // HR
  | "hr:view_employees"
  | "hr:manage_employees"
  | "hr:process_payroll"
  // Security & Audit
  | "audit:view_logs"
  | "admin:manage_users"
  | "admin:system_config";

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    "inventory:view",
    "inventory:create_move",
    "inventory:validate_move",
    "inventory:adjust_stock",
    "inventory:view_valuation",
    "pos:open_session",
    "pos:close_session",
    "pos:process_sale",
    "pos:refund",
    "accounting:view_ledger",
    "accounting:post_entry",
    "accounting:reconcile",
    "accounting:financial_reports",
    "hr:view_employees",
    "hr:manage_employees",
    "hr:process_payroll",
    "audit:view_logs",
    "admin:manage_users",
    "admin:system_config",
  ],
  ACCOUNTANT: [
    "inventory:view",
    "inventory:view_valuation",
    "pos:close_session",
    "accounting:view_ledger",
    "accounting:post_entry",
    "accounting:reconcile",
    "accounting:financial_reports",
    "hr:view_employees",
    "hr:process_payroll",
    "audit:view_logs",
  ],
  INVENTORY_MANAGER: [
    "inventory:view",
    "inventory:create_move",
    "inventory:validate_move",
    "inventory:adjust_stock",
    "inventory:view_valuation",
    "pos:open_session",
  ],
  CASHIER: [
    "pos:open_session",
    "pos:close_session",
    "pos:process_sale",
  ],
  HR_MANAGER: [
    "hr:view_employees",
    "hr:manage_employees",
    "hr:process_payroll",
    "accounting:view_ledger",
  ],
  AUDITOR: [
    "inventory:view",
    "inventory:view_valuation",
    "accounting:view_ledger",
    "accounting:financial_reports",
    "hr:view_employees",
    "audit:view_logs",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}
