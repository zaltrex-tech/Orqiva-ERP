import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

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

import { ToastProvider } from "@/components/ui/toast-provider";

export const metadata: Metadata = {
  title: "Orqiva ERP | Bespoke Modular Enterprise Monolith",
  description:
    "Next-generation modular ERP for Inventory, POS, Double-Entry Accounting, and HR with strict concurrency control and immutable audit trails.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${plusJakarta.variable} font-sans min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-amber-500 selection:text-slate-950`}
      >
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
