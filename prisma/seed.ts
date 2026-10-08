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

  // 5. Default Branch (Warehouse & Locations)
  const branch = await prisma.warehouse.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: "BRANCH-MAIN" } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: "BRANCH-MAIN",
      name: "Orqiva Flagship Branch & Central Distribution",
      address: "742 Evergreen Commercial Plaza, Suite 100",
    },
  });

  const internalStockLoc = await prisma.location.upsert({
    where: { id: "loc-branch-main-stock" },
    update: {},
    create: {
      id: "loc-branch-main-stock",
      tenantId: tenant.id,
      warehouseId: branch.id,
      name: "BRANCH-MAIN/Stock",
      barcode: "LOC-MAIN-STK",
      type: LocationType.INTERNAL,
    },
  });

  const customerLoc = await prisma.location.upsert({
    where: { id: "loc-virtual-customer" },
    update: {},
    create: {
      id: "loc-virtual-customer",
      tenantId: tenant.id,
      name: "Virtual / Commercial Customers",
      type: LocationType.CUSTOMER,
    },
  });

  // 6. Product Categories
  const catHardware = await prisma.productCategory.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: "CAT-HW" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "POS & Computer Hardware",
      code: "CAT-HW",
      valuationMethod: ValuationMethod.AVCO,
    },
  });

  const catSupplies = await prisma.productCategory.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: "CAT-SUP" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Thermal Paper & Consumables",
      code: "CAT-SUP",
      valuationMethod: ValuationMethod.AVCO,
    },
  });

  // 7. 10 Mock Products with Initial Stock Quants
  const mockProductsList = [
    {
      sku: "PRD-POS-TERM-15",
      name: "Orqiva Touch POS Terminal Pro (15.6\")",
      description: "Capacitive multi-touch terminal with integrated MSR",
      costPrice: 420.0,
      sellingPrice: 750.0,
      taxRate: 15.0,
      minStockAlert: 15,
      qty: 120,
      categoryId: catHardware.id,
    },
    {
      sku: "PRD-BAR-SCAN-2D",
      name: "Omni-directional 2D Barcode Scanner",
      description: "Rugged hands-free presentation barcode scanner",
      costPrice: 65.0,
      sellingPrice: 140.0,
      taxRate: 15.0,
      minStockAlert: 20,
      qty: 350,
      categoryId: catHardware.id,
    },
    {
      sku: "PRD-REC-PRN-80",
      name: "High-Speed Thermal Receipt Printer (80mm)",
      description: "Auto-cutter, Ethernet + USB + Serial interfaces",
      costPrice: 85.0,
      sellingPrice: 195.0,
      taxRate: 15.0,
      minStockAlert: 25,
      qty: 90,
      categoryId: catHardware.id,
    },
    {
      sku: "PRD-CSH-DRW-HV",
      name: "Heavy-Duty Steel Cash Drawer (5B/8C)",
      description: "Electronic RJ12 solenoid kick with dual media slots",
      costPrice: 45.0,
      sellingPrice: 110.0,
      taxRate: 15.0,
      minStockAlert: 10,
      qty: 65,
      categoryId: catHardware.id,
    },
    {
      sku: "PRD-CUST-DISP-VFD",
      name: "2-Line VFD Pole Customer Display",
      description: "Bright blue-green fluorescent alphanumeric screen",
      costPrice: 38.0,
      sellingPrice: 85.0,
      taxRate: 15.0,
      minStockAlert: 10,
      qty: 40,
      categoryId: catHardware.id,
    },
    {
      sku: "PRD-THM-PPR-80M",
      name: "Thermal Paper Roll Box (80mm x 80m, Box of 50)",
      description: "BPA-free high-sensitivity premium thermal paper rolls",
      costPrice: 28.0,
      sellingPrice: 65.0,
      taxRate: 15.0,
      minStockAlert: 30,
      qty: 180,
      categoryId: catSupplies.id,
    },
    {
      sku: "PRD-THM-LBL-4X6",
      name: "Direct Thermal Shipping Labels (4\"x6\", Roll of 500)",
      description: "Permanent adhesive smudge-proof logistics label rolls",
      costPrice: 8.5,
      sellingPrice: 22.0,
      taxRate: 15.0,
      minStockAlert: 50,
      qty: 240,
      categoryId: catSupplies.id,
    },
    {
      sku: "PRD-NFC-PIN-PAD",
      name: "PCI-PTS Certified Contactless Pin Pad",
      description: "Apple Pay, Google Pay, and EMV chip verified terminal",
      costPrice: 140.0,
      sellingPrice: 290.0,
      taxRate: 15.0,
      minStockAlert: 15,
      qty: 55,
      categoryId: catHardware.id,
    },
    {
      sku: "PRD-WIFI-SCALE",
      name: "Integrated Bench POS Scale (15kg x 2g)",
      description: "Legal-for-trade stainless steel barcode scale with RS232",
      costPrice: 180.0,
      sellingPrice: 380.0,
      taxRate: 15.0,
      minStockAlert: 8,
      qty: 25,
      categoryId: catHardware.id,
    },
    {
      sku: "PRD-UPS-BATT-850",
      name: "POS Pure Sine Wave UPS Backup (850VA)",
      description: "Protects register against line brownouts and power surges",
      costPrice: 75.0,
      sellingPrice: 160.0,
      taxRate: 15.0,
      minStockAlert: 12,
      qty: 45,
      categoryId: catHardware.id,
    },
  ];

  for (const prod of mockProductsList) {
    const createdProduct = await prisma.product.upsert({
      where: { tenantId_sku: { tenantId: tenant.id, sku: prod.sku } },
      update: {
        costPrice: prod.costPrice,
        sellingPrice: prod.sellingPrice,
      },
      create: {
        tenantId: tenant.id,
        categoryId: prod.categoryId,
        sku: prod.sku,
        name: prod.name,
        description: prod.description,
        costPrice: prod.costPrice,
        sellingPrice: prod.sellingPrice,
        taxRate: prod.taxRate,
        minStockAlert: prod.minStockAlert,
      },
    });

    await prisma.stockQuant.upsert({
      where: {
        tenantId_productId_locationId: {
          tenantId: tenant.id,
          productId: createdProduct.id,
          locationId: internalStockLoc.id,
        },
      },
      update: {
        quantity: prod.qty,
      },
      create: {
        tenantId: tenant.id,
        productId: createdProduct.id,
        locationId: internalStockLoc.id,
        quantity: prod.qty,
        reservedQuantity: 0.0,
      },
    });
  }

  console.log(`✅ Seeded 10 Mock Products & Stock Quants for Branch: ${branch.name}`);

  // 8. Seed Open POS Session for Sarah Jenkins (Cashier)
  await prisma.posSession.upsert({
    where: { tenantId_sessionNumber: { tenantId: tenant.id, sessionNumber: "POS-SESS-00045" } },
    update: {},
    create: {
      tenantId: tenant.id,
      cashierId: cashier.id,
      sessionNumber: "POS-SESS-00045",
      openingBalance: 250.0,
      totalSales: 12480.0,
    },
  });

  // 9. Seed Sample HR Employee
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
