import { describe, it, expect } from "vitest";
import { en } from "@/lib/i18n/dictionaries/en";
import { ar } from "@/lib/i18n/dictionaries/ar";

describe("Internationalization & Bilingual Dictionary Integrity", () => {
  it("should contain all mandatory domain namespaces in English and Arabic", () => {
    const requiredSections = ["common", "nav", "header", "dashboard", "pos", "users"] as const;

    for (const section of requiredSections) {
      expect(en).toHaveProperty(section);
      expect(ar).toHaveProperty(section);
    }
  });

  it("should have complete navigation translations in Arabic for RTL rendering", () => {
    expect(ar.nav.overview).toBe("لوحة التحكم التنفيذية");
    expect(ar.nav.inventory).toBe("المخزون واللوجستيات");
    expect(ar.nav.pos).toBe("نقطة البيع (POS)");
    expect(ar.nav.accounting).toBe("المحاسبة المالية المزدوجة");
    expect(ar.nav.hr).toBe("الموارد البشرية والرواتب");
    expect(ar.nav.users).toBe("إدارة المستخدمين والأذونات");
  });

  it("should have complete User Management CRUD translations in Arabic", () => {
    expect(ar.users.title).toContain("إدارة المستخدمين");
    expect(ar.users.newUser).toBe("مستخدم جديد");
    expect(ar.users.roleSuperAdmin).toBe("المشرف العام");
    expect(ar.users.roleCashier).toBe("كاشير أول");
    expect(ar.users.statusActive).toBe("نشط");
    expect(ar.users.statusDeactivated).toBe("معطل");
  });

  it("should match schema parity across all namespaces between en and ar dictionaries", () => {
    const namespaces = Object.keys(en) as Array<keyof typeof en>;
    for (const ns of namespaces) {
      expect(ar).toHaveProperty(ns);
      const enKeys = Object.keys(en[ns]).sort();
      const arKeys = Object.keys(ar[ns]).sort();
      expect(arKeys).toEqual(enKeys);
    }
  });

  it("should have complete navigation translations including transfers and adjustments", () => {
    expect(ar.nav.transfers).toBe("التحويلات المخزنية");
    expect(ar.nav.adjustments).toBe("الجرد المخزني والتسويات");
    expect(ar.dashboard.title).toBe("العمليات التشغيلية التنفيذية");
    expect(ar.inventory.title).toBe("عمليات المخزون والمستودعات المتعددة");
    expect(ar.accounting.title).toBe("المحاسبة المالية والأستاذ العام");
    expect(ar.hr.title).toBe("الموارد البشرية ومسير الرواتب الآلي");
    expect(ar.auth.title).toBe("تسجيل الدخول إلى بوابة النظام");
  });
});
