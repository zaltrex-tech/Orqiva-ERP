import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, Cairo } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast-provider";
import { I18nProvider } from "@/lib/i18n/context";
import { Locale } from "@/lib/i18n/types";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Orqiva ERP | Bespoke Modular Enterprise Monolith",
  description:
    "Next-generation modular ERP for Inventory, POS, Double-Entry Accounting, and HR with strict concurrency control and immutable audit trails.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const rawLocale = cookieStore.get("NEXT_LOCALE")?.value;
  const initialLocale: Locale = rawLocale === "ar" ? "ar" : "en";
  const initialDir = initialLocale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={initialLocale} dir={initialDir} className={`dark ${inter.variable} ${plusJakarta.variable} ${cairo.variable}`}>
      <body
        className={`${inter.variable} ${plusJakarta.variable} ${cairo.variable} font-sans min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-amber-500 selection:text-slate-950`}
      >
        <I18nProvider initialLocale={initialLocale}>
          {children}
          <ToastProvider />
        </I18nProvider>
      </body>
    </html>
  );
}
