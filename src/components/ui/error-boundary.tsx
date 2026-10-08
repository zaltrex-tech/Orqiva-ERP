"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertOctagon, RotateCcw } from "lucide-react";
import { Button } from "./button";
import { useI18n } from "@/lib/i18n/context";

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function ErrorFallbackUI({
  error,
  fallbackMessage,
  onReset,
}: {
  error: Error | null;
  fallbackMessage?: string;
  onReset: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="p-8 my-6 rounded-2xl bg-slate-900/80 border border-rose-500/30 backdrop-blur-xl text-center space-y-4 max-w-xl mx-auto shadow-luxury-md">
      <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto">
        <AlertOctagon className="w-6 h-6" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-bold text-slate-100">
          {t("errorBoundary.title", "System Interface Interruption Protected")}
        </h3>
        <p className="text-xs text-slate-400">
          {fallbackMessage ||
            t(
              "errorBoundary.defaultMessage",
              "A non-fatal interface component error occurred. Monolithic database state and session security remain intact."
            )}
        </p>
        {error && (
          <pre className="p-3 mt-2 rounded bg-slate-950 text-start font-mono text-[11px] text-rose-300 overflow-x-auto border border-slate-800">
            {error.message}
          </pre>
        )}
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={onReset}
        className="gap-2 mx-auto"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        {t("errorBoundary.recover", "Recover Interface State")}
      </Button>
    </div>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[CRITICAL UI ERROR BOUNDARY CAUGHT]:", error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <ErrorFallbackUI
          error={this.state.error}
          fallbackMessage={this.props.fallbackMessage}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}
