import { test, expect } from "@playwright/test";

test.describe("Bilingual i18n & User Management Workflow", () => {
  test("toggles Arabic RTL layout and verifies User Management dashboard", async ({ page }) => {
    // 1. Navigate to Executive Dashboard
    await page.goto("/");
    await expect(page).toHaveTitle(/Orqiva ERP/i);

    // Initial state: dir is ltr
    const htmlTag = page.locator("html");
    await expect(htmlTag).toHaveAttribute("dir", "ltr");

    // 2. Click Language Switcher to activate Arabic (RTL)
    const langBtn = page.locator("#language-switcher-btn");
    await expect(langBtn).toBeVisible();
    await langBtn.click();

    // 3. Verify HTML updates to dir="rtl" and lang="ar"
    await expect(htmlTag).toHaveAttribute("dir", "rtl");
    await expect(htmlTag).toHaveAttribute("lang", "ar");

    // Verify Arabic strings appear in the UI
    await expect(page.locator("text=لوحة التحكم التنفيذية").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=المشرف العام")).toBeVisible();

    // 4. Navigate to User Management
    await page.goto("/admin/users");
    await page.waitForLoadState("domcontentloaded");

    // 5. Verify User Management Datatable is loaded
    await expect(page.locator("text=إدارة المستخدمين").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Alexander Vance").first()).toBeVisible({ timeout: 15000 });

    // 6. Open "New User" modal dialog
    const addUserBtn = page.locator("#add-user-btn");
    await expect(addUserBtn).toBeVisible();
    await addUserBtn.click();

    // Verify Modal form appears with fields
    await expect(page.locator("text=إنشاء حساب مستخدم مؤسسي جديد")).toBeVisible();
    await expect(page.locator("input[placeholder*='Tariq'], input[placeholder*='طارق'], input[name='fullName'], form input[type='text']").first()).toBeVisible();

    // 7. Close modal dialog
    const cancelBtn = page.locator("button:has-text('إلغاء')");
    await cancelBtn.click();
    await expect(page.locator("text=إنشاء حساب مستخدم مؤسسي جديد")).toBeHidden();

    // 8. Toggle back to English LTR
    await langBtn.click();
    await expect(htmlTag).toHaveAttribute("dir", "ltr");
    await expect(htmlTag).toHaveAttribute("lang", "en");
    await expect(page.locator("text=User Management & RBAC").first()).toBeVisible();
  });
});
