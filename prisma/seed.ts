import { PrismaClient, UserRole, LocationType, AccountType, JournalType, ValuationMethod } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Seeding Orqiva ERP Database with Enterprise Master Data...");

  // 1. Create Default Tenant
  const tenant = await prisma.tenant.upsert({
    where: { code: "ORQ-MAIN" },
    update: {},
    create: {
      name: "Orqiva Enterprise Holdings",
      code: "ORQ-MAIN",
      currency: "USD",
      fiscalYearStartMonth: 1,
    },
  });

  console.log(`✅ Tenant initialized: ${tenant.name} (${tenant.code})`);

  // 2. Hash Password & Seed Users with granular RBAC
  const defaultPassword = await bcrypt.hash("Admin@Orqiva2026!", 10);

  const superAdmin = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: "admin@orqiva.io",
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "admin@orqiva.io",
      fullName: "Alexander Vance (Executive Admin)",
      role: UserRole.SUPER_ADMIN,
      passwordHash: defaultPassword,
    },
  });

  const accountant = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: "finance@orqiva.io",
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "finance@orqiva.io",
      fullName: "Elena Rostova (Chief Accountant)",
      role: UserRole.ACCOUNTANT,
      passwordHash: defaultPassword,
    },
  });

  const inventoryManager = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: "inventory@orqiva.io",
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "inventory@orqiva.io",
      fullName: "Marcus Sterling (Logistics Director)",
      role: UserRole.INVENTORY_MANAGER,
      passwordHash: defaultPassword,
    },
  });

  const cashier = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: "cashier@orqiva.io",
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "cashier@orqiva.io",
      fullName: "Sarah Jenkins (Senior Cashier)",
      role: UserRole.CASHIER,
      passwordHash: defaultPassword,
    },
  });

  console.log("✅ Seeded Core RBAC Users (Super Admin, Accountant, Inventory Mgr, Cashier)");

  // 3. Standard Chart of Accounts (Odoo-compliant Double Entry)
  const accountsData = [
    { code: "1010", name: "Operating Cash Account", type: AccountType.ASSET_CURRENT },
    { code: "1020", name: "JPMorgan Treasury Bank Account", type: AccountType.ASSET_CURRENT },
    { code: "1030", name: "Finished Goods Inventory Asset", type: AccountType.ASSET_CURRENT },
    { code: "1040", name: "Accounts Receivable (Trade)", type: AccountType.ASSET_CURRENT },
    { code: "2010", name: "Accounts Payable (Vendors)", type: AccountType.LIABILITY_CURRENT },
    { code: "2020", name: "Sales Tax / VAT Payable (15%)", type: AccountType.LIABILITY_CURRENT },
    { code: "3010", name: "Owner Equity / Common Capital", type: AccountType.EQUITY },
    { code: "4010", name: "Wholesale & POS Commercial Revenue", type: AccountType.INCOME },
    { code: "5010", name: "Cost of Goods Sold (COGS)", type: AccountType.COST_OF_REVENUE },
    { code: "6010", name: "Corporate Payroll & Salaries", type: AccountType.EXPENSE },
  ];

  for (const acc of accountsData) {
    await prisma.account.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: acc.code } },
      update: {},
      create: {
        tenantId: tenant.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
      },
    });
  }
  console.log("✅ Seeded Double-Entry Chart of Accounts");

  // 4. Journals
  const journalsData = [
    { code: "CSH", name: "Main Cash Register", type: JournalType.CASH },
    { code: "BNK", name: "Corporate Bank Journal", type: JournalType.BANK },
    { code: "INV", name: "Customer Invoicing Journal", type: JournalType.SALE },
    { code: "BILL", name: "Vendor Bills Journal", type: JournalType.PURCHASE },
    { code: "GEN", name: "General Miscellaneous Ledger", type: JournalType.GENERAL },
  ];

  for (const jnl of journalsData) {
    await prisma.journal.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: jnl.code } },
      update: {},
      create: {
        tenantId: tenant.id,
        code: jnl.code,
        name: jnl.name,
        type: jnl.type,
      },
    });
  }
  console.log("✅ Seeded Standard Accounting Journals");

  // 5. Multi-Warehouse Setup
  const warehouse = await prisma.warehouse.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: "WH-NORTH" } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: "WH-NORTH",
      name: "Northern Logistics Hub",
      address: "Industrial Gateway Blvd, Bldg 4",
    },
  });

  const internalStockLoc = await prisma.location.create({
    data: {
      tenantId: tenant.id,
      warehouseId: warehouse.id,
      name: "WH-NORTH/Stock",
      barcode: "LOC-WHN-STK",
      type: LocationType.INTERNAL,
    },
  });

  const customerLoc = await prisma.location.create({
    data: {
      tenantId: tenant.id,
      name: "Virtual / Customers",
      type: LocationType.CUSTOMER,
    },
  });

  // 6. Product Category & Products
  const category = await prisma.productCategory.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: "CAT-TECH" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Enterprise Hardware & POS Peripherals",
      code: "CAT-TECH",
      valuationMethod: ValuationMethod.AVCO,
    },
  });

  const productA = await prisma.product.upsert({
    where: { tenantId_sku: { tenantId: tenant.id, sku: "PRD-POS-TERM" } },
    update: {},
    create: {
      tenantId: tenant.id,
      categoryId: category.id,
      sku: "PRD-POS-TERM",
      barcode: "893452109823",
      name: "Orqiva Touch POS Terminal Pro (15.6\")",
      description: "High-throughput capacitive terminal with NFC and thermal receipt hub",
      costPrice: 420.0,
      sellingPrice: 750.0,
      taxRate: 15.0,
      minStockAlert: 15,
    },
  });

  const productB = await prisma.product.upsert({
    where: { tenantId_sku: { tenantId: tenant.id, sku: "PRD-BAR-SCAN" } },
    update: {},
    create: {
      tenantId: tenant.id,
      categoryId: category.id,
      sku: "PRD-BAR-SCAN",
      barcode: "893452109855",
      name: "Omni-directional 2D Barcode Scanner",
      description: "Ultra-fast laser barcode scanner with ruggedized drop-proof casing",
      costPrice: 65.0,
      sellingPrice: 140.0,
      taxRate: 15.0,
      minStockAlert: 25,
    },
  });

  // 7. Seed Initial Stock Quants with Row Concurrency
  await prisma.stockQuant.upsert({
    where: {
      tenantId_productId_locationId: {
        tenantId: tenant.id,
        productId: productA.id,
        locationId: internalStockLoc.id,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      productId: productA.id,
      locationId: internalStockLoc.id,
      quantity: 120.0,
      reservedQuantity: 0.0,
    },
  });

  await prisma.stockQuant.upsert({
    where: {
      tenantId_productId_locationId: {
        tenantId: tenant.id,
        productId: productB.id,
        locationId: internalStockLoc.id,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      productId: productB.id,
      locationId: internalStockLoc.id,
      quantity: 350.0,
      reservedQuantity: 0.0,
    },
  });

  console.log("✅ Seeded Warehouses, Locations, Products & Stock Quants");

  // 8. Seed Sample HR Employee
  await prisma.employee.upsert({
    where: { tenantId_employeeCode: { tenantId: tenant.id, employeeCode: "EMP-00101" } },
    update: {},
    create: {
      tenantId: tenant.id,
      employeeCode: "EMP-00101",
      firstName: "Julian",
      lastName: "Mercer",
      email: "j.mercer@orqiva.io",
      department: "Supply Chain & Operations",
      position: "Senior Inventory Controller",
      basicSalary: 6800.0,
      joinedDate: new Date("2024-03-01"),
    },
  });

  console.log("✅ Seeded Initial HR Employee Directory");
  console.log("🎉 Seeding Completed Successfully.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
