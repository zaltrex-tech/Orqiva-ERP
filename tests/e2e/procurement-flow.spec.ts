import { test, expect } from "@playwright/test";

test.describe("Phase 5: Procurement Cycle, Financial Reports & POS Barcode Scanner", () => {
  test("verifies procurement views, supplier directory, and purchase order workflow", async ({ page }) => {
    // 1. Navigate to Purchases Dashboard
    await page.goto("/purchases");
    await expect(page).toHaveTitle(/Orqiva ERP/i);

    // 2. Verify Purchases page loaded
    await expect(page.locator("text=Procurement & Procure-to-Pay").first()).toBeVisible({ timeout: 25000 });
    await expect(page.locator("text=Purchase Orders").first()).toBeVisible();

    // 3. Switch to Suppliers directory tab
    const vendorsTab = page.locator("button:has-text('Suppliers & Vendors')");
    await expect(vendorsTab).toBeVisible();
    await vendorsTab.click();

    // 4. Verify supplier action button is available and open modal
    const newVendorBtn = page.locator("#new-vendor-btn");
    await expect(newVendorBtn).toBeVisible({ timeout: 10000 });
    await newVendorBtn.click();

    // Verify Register Supplier modal dialog appears with fields
    await expect(page.locator("text=Register New Supplier").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("input[placeholder*='Al-Futtaim']")).toBeVisible();

    // Close modal
    const closeBtn = page.locator("button:has-text('Cancel')").first();
    await closeBtn.click();
    await expect(page.locator("text=Register New Supplier")).toBeHidden({ timeout: 5000 });
  });

  test("verifies Financial Statements (Trial Balance, P&L, Balance Sheet) and audit invariants", async ({ page }) => {
    // 1. Navigate to Financial Reports
    await page.goto("/accounting/reports");
    await expect(page).toHaveTitle(/Orqiva ERP/i);

    // 2. Verify Trial Balance tab is active and ledger data loaded
    await expect(page.locator("text=Executive Financial Statements").first()).toBeVisible({ timeout: 25000 });
    await expect(page.locator("text=Trial Balance").first()).toBeVisible();
    await expect(page.locator("text=100% INVARIANT").first()).toBeVisible({ timeout: 25000 });

    // 3. Switch to Profit & Loss tab
    const pnlTab = page.locator("button:has-text('Profit & Loss')");
    await expect(pnlTab).toBeVisible();
    await pnlTab.click();

    // Verify P&L headers
    await expect(page.locator("text=Operating Revenue").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Cost of Goods Sold").first()).toBeVisible();
    await expect(page.locator("text=Gross Profit").first()).toBeVisible();
    await expect(page.locator("text=Net Operating Income").first()).toBeVisible();

    // 4. Switch to Balance Sheet tab
    const balanceSheetTab = page.locator("button:has-text('Balance Sheet')");
    await expect(balanceSheetTab).toBeVisible();
    await balanceSheetTab.click();

    // Verify Balance Sheet headers and accounting equation
    await expect(page.locator("text=Total Assets").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Total Liabilities & Equity").first()).toBeVisible();
    await expect(page.locator("text=BALANCED").first()).toBeVisible();
  });

  test("verifies POS hardware barcode scanner integration and automatic cart addition", async ({ page }) => {
    // 1. Navigate to POS
    await page.goto("/pos");
    await expect(page).toHaveTitle(/Orqiva ERP/i);

    // 2. Verify scanner status badge is active
    await expect(page.locator("text=SCANNER ACTIVE").first()).toBeVisible({ timeout: 25000 });

    // 3. Ensure product catalog has loaded from API
    const productCard = page.locator("text=PRD-POS-TERM-15").first();
    await expect(productCard).toBeVisible({ timeout: 25000 });

    // 4. Locate the barcode input element and simulate scanner burst
    const barcodeInput = page.locator("[data-testid='barcode-input']");
    await expect(barcodeInput).toBeVisible();
    await barcodeInput.fill("PRD-POS-TERM-15");
    await barcodeInput.press("Enter");

    // 5. Verify cart is populated with the scanned item
    await expect(page.locator("text=1 ITEMS")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Total Amount Due:")).toBeVisible();
  });
});
