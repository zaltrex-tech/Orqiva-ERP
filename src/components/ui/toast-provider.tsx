"use client";

import { Toaster as SonnerToaster } from "sonner";
import { useI18n } from "@/lib/i18n/context";

export function ToastProvider() {
  const { direction } = useI18n();
  const isRtl = direction === "rtl";

  return (
    <SonnerToaster
      theme="dark"
      dir={isRtl ? "rtl" : "ltr"}
      position={isRtl ? "top-left" : "top-right"}
      richColors
      closeButton
      toastOptions={{
        style: {
          background: "#0c111d",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          color: "#f8fafc",
          fontFamily: isRtl ? "var(--font-cairo), system-ui, sans-serif" : "var(--font-inter), system-ui, sans-serif",
        },
      }}
    />
  );
}
