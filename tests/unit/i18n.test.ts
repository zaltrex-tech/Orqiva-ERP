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

  it("should match schema parity between en and ar dictionaries", () => {
    const enUserKeys = Object.keys(en.users);
    const arUserKeys = Object.keys(ar.users);
    expect(arUserKeys.sort()).toEqual(enUserKeys.sort());

    const enNavKeys = Object.keys(en.nav);
    const arNavKeys = Object.keys(ar.nav);
    expect(arNavKeys.sort()).toEqual(enNavKeys.sort());
  });
});
