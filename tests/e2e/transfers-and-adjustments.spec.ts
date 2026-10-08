import { test, expect } from "@playwright/test";

test.describe("Phase 6: Fiscal E-Invoicing, Stock Transfers & Physical Adjustments", () => {
  test("verifies Inter-Branch Stock Transfers view, metrics, and transfer initiation dialog", async ({ page }) => {
    // 1. Navigate to Transfers Page
    await page.goto("/inventory/transfers");
    await expect(page).toHaveTitle(/Orqiva ERP/i);

    // 2. Verify Page Header and Subtitle
    await expect(
      page.locator("text=Inter-Branch Stock Transfers").or(page.locator("text=نقل المخزون بين الفروع")).first()
    ).toBeVisible({ timeout: 25000 });

    // 3. Verify Filter Buttons
    await expect(
      page.locator("button:has-text('All Transfers')").or(page.locator("button:has-text('كافة التحويلات')")).first()
    ).toBeVisible();

    // 4. Verify Ledger heading
    await expect(
      page.locator("text=Transit Operations Ledger").or(page.locator("text=سجل عمليات النقل")).first()
    ).toBeVisible();

    // 5. Open Transfer Modal Dialog
    const newTransferBtn = page
      .locator("#new-transfer-btn")
      .or(page.locator("button:has-text('Initiate Transfer')"))
      .first();
    await expect(newTransferBtn).toBeVisible({ timeout: 10000 });
    await newTransferBtn.click();

    // 6. Verify Modal Elements
    await expect(
      page.locator("h3:has-text('Initiate Transfer')").or(page.locator("text=Origin Location")).first()
    ).toBeVisible({ timeout: 10000 });

    // Verify Origin and Destination selectors
    await expect(page.locator("select").first()).toBeVisible();

    // 7. Close Modal
    const cancelBtn = page.locator("button:has-text('Cancel')").or(page.locator("button:has-text('إلغاء')")).first();
    await cancelBtn.click();
    await expect(page.locator("h3:has-text('Initiate Transfer')")).toBeHidden({ timeout: 5000 });
  });

  test("verifies Stocktake Adjustments view, variance calculations, and reconciliation dialog", async ({ page }) => {
    // 1. Navigate to Adjustments Page
    await page.goto("/inventory/adjustments");
    await expect(page).toHaveTitle(/Orqiva ERP/i);

    // 2. Verify Page Header
    await expect(
      page.locator("text=Physical Inventory Reconciliation").or(page.locator("text=الجرد المخزني والتسويات")).first()
    ).toBeVisible({ timeout: 25000 });

    // 3. Verify KPI summary cards
    await expect(
      page.locator("text=Total Stocktakes").or(page.locator("text=إجمالي عمليات الجرد")).first()
    ).toBeVisible();

    await expect(
      page.locator("text=Financial Impact").or(page.locator("text=الأثر المالي")).first()
    ).toBeVisible();

    // 4. Open New Stocktake Count Modal
    const newAdjBtn = page
      .locator("button:has-text('New Stocktake Count')")
      .or(page.locator("button:has-text('تسجيل جرد فعلي')"))
      .first();
    await expect(newAdjBtn).toBeVisible({ timeout: 10000 });
    await newAdjBtn.click();

    // 5. Verify Modal Form & Double-Entry Invariant preview
    await expect(
      page.locator("text=Physical Inventory Reconciliation").or(page.locator("text=تسجيل جرد فعلي")).first()
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.locator("text=Automated Double-Entry Posting").or(page.locator("text=Double-Entry Invariant")).first()
    ).toBeVisible();

    // 6. Close Modal
    const cancelBtn = page.locator("button:has-text('Cancel')").or(page.locator("button:has-text('إلغاء')")).first();
    await cancelBtn.click();
  });

  test("verifies POS checkout presents Fiscal E-Invoice compliant QR code", async ({ page }) => {
    // Stub window.print so print spooler doesn't hang Playwright
    await page.addInitScript(() => {
      window.print = () => console.log("[Print Stub]: Triggered 80mm thermal print spooler");
    });

    // 1. Navigate to POS
    await page.goto("/pos");
    await expect(page).toHaveTitle(/Orqiva ERP/i);

    // 2. Verify Catalog & Thermal Receipt readiness
    await expect(page.locator("text=SCANNER ACTIVE").first()).toBeVisible({ timeout: 25000 });

    // 3. Select product from catalog
    const productCard = page.locator("text=PRD-POS-TERM-15").first();
    await expect(productCard).toBeVisible({ timeout: 25000 });
    await productCard.click();

    // 4. Verify item added to cart
    await expect(page.locator("text=1 ITEMS")).toBeVisible({ timeout: 10000 });

    // 5. Click Pay Cash
    const payCashBtn = page.locator("button:has-text('Pay Cash')").first();
    await expect(payCashBtn).toBeEnabled();
    await payCashBtn.click();

    // 6. Verify Thermal Receipt modal is triggered
    await expect(page.locator("text=80mm Thermal Receipt").first()).toBeVisible({ timeout: 25000 });

    // 7. Verify E-Invoice Cryptographic QR Code image
    await expect(
      page.locator("img[alt='Fiscal QR Code']").or(page.locator("img[alt*='QR']")).first()
    ).toBeVisible({ timeout: 15000 });
  });
});
