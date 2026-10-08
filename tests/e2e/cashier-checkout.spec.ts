import { test, expect } from "@playwright/test";

test.describe("Cashier POS Checkout Workflow", () => {
  test("authenticates as cashier, selects product, pays cash, and triggers thermal receipt", async ({ page }) => {
    // Stub window.print so browser print modal does not block headless Playwright
    await page.addInitScript(() => {
      window.print = () => console.log("[Print Stub]: Triggered 80mm thermal print spooler");
    });

    // 1. Navigate to Login Page
    await page.goto("/login");
    await expect(page).toHaveTitle(/Orqiva ERP/i);

    // Fill credentials for Senior Cashier
    const emailInput = page.locator("#email-input");
    const passwordInput = page.locator("#password-input");
    const submitBtn = page.locator("#login-submit-btn");

    await emailInput.fill("cashier@orqiva.io");
    await passwordInput.fill("Admin@Orqiva2026!");
    await submitBtn.click();

    // 2. Verify redirection to POS Terminal
    await page.waitForURL("**/pos", { timeout: 10000 });
    await expect(page.locator("text=POS Terminal 01")).toBeVisible({ timeout: 10000 });

    // 3. Select a product from the live catalog
    const productCard = page.locator("text=PRD-POS-TERM-15").first();
    await expect(productCard).toBeVisible({ timeout: 10000 });
    await productCard.click();

    // 4. Verify Active Cart updated with item and financial subtotals
    await expect(page.locator("text=1 ITEMS")).toBeVisible();
    await expect(page.locator("text=Total Amount Due:")).toBeVisible();

    // 5. Intercept the POST /api/v1/pos/order API network response
    const orderPromise = page.waitForResponse(
      (response) => response.url().includes("/api/v1/pos/order") && response.status() === 200,
      { timeout: 15000 }
    );

    // 6. Click "Pay Cash" button
    const payCashBtn = page.locator("button:has-text('Pay Cash')");
    await expect(payCashBtn).toBeEnabled();
    await payCashBtn.click();

    // 7. Verify API completed successfully under row-level lock
    const orderResponse = await orderPromise;
    const responseJson = await orderResponse.json();
    expect(responseJson.success).toBe(true);
    expect(responseJson.data?.orderId).toBeDefined();

    // 8. Verify the 80mm Thermal Receipt Print modal is triggered
    await expect(page.locator("text=80mm Thermal Receipt")).toBeVisible({ timeout: 5000 });
    const receiptContainer = page.locator("#thermal-receipt-container");
    await expect(receiptContainer).toBeVisible();
    await expect(receiptContainer.getByText("ORQIVA ERP")).toBeVisible();
    await expect(receiptContainer.getByText("VAT REG ID: 300492817200003")).toBeVisible();
    await expect(receiptContainer.getByText("TOTAL PAID:")).toBeVisible();
  });
});
