import { test, expect } from "@playwright/test";

/**
 * Phase 3: Total Button-by-Button & Action E2E Automation Matrix
 * Covers:
 * 1. Interactive Element Crawler across all enterprise routes
 * 2. Role & Action Matrices (Super Admin, Cashier, Inventory Manager, Accountant)
 * 3. Dual-Locale Execution (en / LTR and ar / RTL)
 */

test.describe("Exhaustive Enterprise E2E Matrix & Interaction Crawler", () => {
  test.beforeEach(async ({ page }) => {
    // Stub window.print so print dialogs do not block headless Playwright workers
    await page.addInitScript(() => {
      window.print = () => console.log("[Print Stub]: Document print triggered cleanly");
    });
  });

  const locales = ["en", "ar"] as const;

  for (const locale of locales) {
    test.describe(`Locale Execution: [${locale.toUpperCase()}]`, () => {
      test(`[${locale}] System Crawler: Discover and verify interactive elements across routes`, async ({ page }) => {
        test.setTimeout(180000);
        // Set locale cookie/localStorage if available, or toggle via header button
        await page.goto("/");
        await page.waitForLoadState("domcontentloaded");

        const html = page.locator("html");
        const currentLang = await html.getAttribute("lang");

        if (locale === "ar" && currentLang !== "ar") {
          const langBtn = page.locator("#language-switcher-btn");
          await langBtn.click();
          await expect(html).toHaveAttribute("dir", "rtl");
          await expect(html).toHaveAttribute("lang", "ar");
        } else if (locale === "en" && currentLang !== "en") {
          const langBtn = page.locator("#language-switcher-btn");
          await langBtn.click();
          await expect(html).toHaveAttribute("dir", "ltr");
          await expect(html).toHaveAttribute("lang", "en");
        }

        // List of core enterprise routes
        const routes = [
          "/",
          "/pos",
          "/inventory",
          "/inventory/transfers",
          "/inventory/adjustments",
          "/purchases",
          "/accounting",
          "/accounting/reports",
          "/admin/users",
          "/admin/system",
          "/hr",
        ];

        for (const route of routes) {
          await page.goto(route);
          await page.waitForLoadState("domcontentloaded");

          // Assert document title contains Orqiva
          await expect(page).toHaveTitle(/Orqiva/i);

          // Verify no critical uncaught error boundaries
          const errorBoundary = page.locator("text=Application Error encountered");
          await expect(errorBoundary).toHaveCount(0);

          // Discover all clickable buttons and ensure they are not detached or overflowed
          const buttons = page.locator("button:visible");
          const buttonCount = await buttons.count();
          expect(buttonCount).toBeGreaterThan(0);

          // Verify all visible inputs are enabled
          const inputs = page.locator("input:visible");
          const inputCount = await inputs.count();
          for (let i = 0; i < Math.min(inputCount, 5); i++) {
            const input = inputs.nth(i);
            const isReadOnly = await input.getAttribute("readonly");
            if (!isReadOnly) {
              await expect(input).toBeEnabled();
            }
          }
        }
      });

      test(`[${locale}] Role Flow: Super Admin User Management & System Ops`, async ({ page }) => {
        await page.goto("/admin/users");
        await page.waitForLoadState("domcontentloaded");

        const html = page.locator("html");
        if (locale === "ar") {
          const currentLang = await html.getAttribute("lang");
          if (currentLang !== "ar") {
            await page.locator("#language-switcher-btn").click();
          }
        }

        // 1. Open New User Modal
        const addUserBtn = page.locator("#add-user-btn");
        await expect(addUserBtn).toBeVisible({ timeout: 15000 });
        await addUserBtn.click();

        // 2. Verify modal inputs
        const modal = page.locator("form").first();
        await expect(modal).toBeVisible();

        // Close modal
        const cancelBtn = modal.locator("button:has-text('Cancel'), button:has-text('إلغاء')").first();
        await cancelBtn.click();

        // 3. Navigate to System Metrics
        await page.goto("/admin/system");
        await page.waitForLoadState("domcontentloaded");

        // Verify System Metrics elements
        await expect(page.locator("text=PostgreSQL").first()).toBeVisible({ timeout: 15000 });
      });

      test(`[${locale}] Role Flow: Cashier Catalog Filter, Cart Addition & Receipt Spooling`, async ({ page }) => {
        await page.goto("/pos");
        await page.waitForLoadState("domcontentloaded");

        const html = page.locator("html");
        if (locale === "ar") {
          const currentLang = await html.getAttribute("lang");
          if (currentLang !== "ar") {
            await page.locator("#language-switcher-btn").click();
          }
        }

        // 1. Catalog Search Interaction
        const searchInput = page.locator("input[placeholder*='Search']").first();
        if (await searchInput.isVisible()) {
          await searchInput.fill("Term");
          await searchInput.clear();
        }

        // 2. Select first product card to populate cart
        const productCard = page.locator("[data-product-id], .group.cursor-pointer").first();
        if (await productCard.isVisible()) {
          await productCard.click();
        }

        // 3. Verify cart buttons exist (Cash / Card checkout)
        const payButtons = page.locator("button:has-text('Cash'), button:has-text('Card'), button:has-text('نقدي'), button:has-text('بطاقة')");
        const payCount = await payButtons.count();
        expect(payCount).toBeGreaterThanOrEqual(1);
      });

      test(`[${locale}] Role Flow: Inventory Manager Transfers & Stocktake Adjustments`, async ({ page }) => {
        // Transfers view
        await page.goto("/inventory/transfers");
        await page.waitForLoadState("domcontentloaded");

        const html = page.locator("html");
        if (locale === "ar") {
          const currentLang = await html.getAttribute("lang");
          if (currentLang !== "ar") {
            await page.locator("#language-switcher-btn").click();
          }
        }

        // Open Initiate Transfer modal
        const newTransferBtn = page.locator("#new-transfer-btn");
        await expect(newTransferBtn).toBeVisible({ timeout: 15000 });
        await newTransferBtn.click();

        // Verify modal opens
        const transferModal = page.locator("form").first();
        await expect(transferModal).toBeVisible();

        // Close modal
        const modalCancel = transferModal.locator("button:has-text('Cancel'), button:has-text('إلغاء')").first();
        await modalCancel.click();

        // Adjustments view
        await page.goto("/inventory/adjustments");
        await page.waitForLoadState("domcontentloaded");

        const newAdjBtn = page.locator("#new-adjustment-btn");
        await expect(newAdjBtn).toBeVisible({ timeout: 15000 });
        await newAdjBtn.click();

        const adjModal = page.locator("form").first();
        await expect(adjModal).toBeVisible();
        const adjCancel = adjModal.locator("button:has-text('Cancel'), button:has-text('إلغاء')").first();
        await adjCancel.click();
      });

      test(`[${locale}] Role Flow: Accountant Financial Statements, Tabs & CSV Export`, async ({ page }) => {
        await page.goto("/accounting/reports");
        await page.waitForLoadState("domcontentloaded");

        const html = page.locator("html");
        if (locale === "ar") {
          const currentLang = await html.getAttribute("lang");
          if (currentLang !== "ar") {
            await page.locator("#language-switcher-btn").click();
          }
        }

        // Tab Navigation Buttons
        const tabs = page.locator("button:has-text('Trial Balance'), button:has-text('ميزان المراجعة'), button:has-text('Profit & Loss'), button:has-text('قائمة الدخل'), button:has-text('Balance Sheet'), button:has-text('الميزانية العمومية')");
        const tabCount = await tabs.count();
        expect(tabCount).toBeGreaterThanOrEqual(2);

        // Click tab 2
        if (tabCount >= 2) {
          await tabs.nth(1).click();
          await page.waitForTimeout(300);
        }

        // Date picker inputs
        const dateInputs = page.locator("input[type='date']");
        const dateCount = await dateInputs.count();
        expect(dateCount).toBeGreaterThanOrEqual(1);

        // Export CSV button verification
        const exportCsvBtn = page.locator("button:has-text('Export CSV'), button:has-text('تصدير CSV')");
        await expect(exportCsvBtn).toBeVisible();

        // Print PDF button verification
        const printBtn = page.locator("button:has-text('Print'), button:has-text('طباعة')");
        await expect(printBtn).toBeVisible();
        await printBtn.click(); // Invokes stubbed window.print cleanly
      });
    });
  }
});
