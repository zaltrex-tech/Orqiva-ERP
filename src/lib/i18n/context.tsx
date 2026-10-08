"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { Locale, Direction, I18nContextType } from "./types";
import { en } from "./dictionaries/en";
import { ar } from "./dictionaries/ar";

const dictionaries = { en, ar };

const I18nContext = createContext<I18nContextType | null>(null);

function getNestedValue(obj: Record<string, any>, path: string): string | undefined {
  const keys = path.split(".");
  let current: any = obj;
  for (const k of keys) {
    if (current && typeof current === "object" && k in current) {
      current = current[k];
    } else {
      return undefined;
    }
  }
  return typeof current === "string" ? current : undefined;
}

export function I18nProvider({
  children,
  initialLocale = "en",
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  // Sync with document element and storage on mount & change
  useEffect(() => {
    // Check if user has an existing preference in localStorage or cookies
    const stored = localStorage.getItem("orqiva_locale") as Locale | null;
    if (stored && (stored === "en" || stored === "ar")) {
      setLocaleState(stored);
      document.documentElement.dir = stored === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = stored;
      document.cookie = `NEXT_LOCALE=${stored}; path=/; max-age=31536000; SameSite=Lax`;
    } else {
      document.documentElement.dir = initialLocale === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = initialLocale;
      localStorage.setItem("orqiva_locale", initialLocale);
      document.cookie = `NEXT_LOCALE=${initialLocale}; path=/; max-age=31536000; SameSite=Lax`;
    }
  }, [initialLocale]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== "undefined") {
      localStorage.setItem("orqiva_locale", newLocale);
      document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
      document.documentElement.dir = newLocale === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = newLocale;
    }
  }, []);

  const toggleLocale = useCallback(() => {
    const next = locale === "en" ? "ar" : "en";
    setLocale(next);
  }, [locale, setLocale]);

  const direction: Direction = useMemo(() => (locale === "ar" ? "rtl" : "ltr"), [locale]);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      const activeDict = dictionaries[locale] || dictionaries.en;
      const val = getNestedValue(activeDict, key);
      if (val !== undefined) return val;

      // Fallback to English
      const enVal = getNestedValue(dictionaries.en, key);
      if (enVal !== undefined) return enVal;

      return fallback || key;
    },
    [locale]
  );

  const value = useMemo(
    () => ({
      locale,
      direction,
      setLocale,
      toggleLocale,
      t,
    }),
    [locale, direction, setLocale, toggleLocale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    // Fallback safe dummy context to prevent crashes in SSR or tests outside provider
    return {
      locale: "en",
      direction: "ltr",
      setLocale: () => {},
      toggleLocale: () => {},
      t: (key: string, fallback?: string) => {
        const val = getNestedValue(dictionaries.en, key);
        return val || fallback || key;
      },
    };
  }
  return context;
}
