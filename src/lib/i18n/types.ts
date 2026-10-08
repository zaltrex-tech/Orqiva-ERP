export type Locale = "en" | "ar";
export type Direction = "ltr" | "rtl";

export interface I18nContextType {
  locale: Locale;
  direction: Direction;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: string, fallback?: string) => string;
}
