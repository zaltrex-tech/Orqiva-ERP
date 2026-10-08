"use client";

import { Toaster as SonnerToaster } from "sonner";

export function ToastProvider() {
  return (
    <SonnerToaster
      theme="dark"
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        style: {
          background: "#0c111d",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          color: "#f8fafc",
          fontFamily: "var(--font-inter)",
        },
      }}
    />
  );
}
