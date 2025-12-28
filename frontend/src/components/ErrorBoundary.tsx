"use client";

import type { ReactNode } from "react";
import React from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  errorMessage: string | null;
};

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, errorMessage: null };

  static getDerivedStateFromError(error: ErrorBoundaryState | Error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return { hasError: true, errorMessage: message };
  }

  componentDidCatch(error: Error) {
    console.error("UI error boundary caught", error);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-lg rounded-3xl border border-slate-200 bg-white px-6 py-8 text-center shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
            Interface Error
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">
            Something went wrong
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Please refresh the page. If the issue persists, report it to your
            support contact.
          </p>
          {this.state.errorMessage ? (
            <p className="mt-3 text-xs text-rose-600">
              {this.state.errorMessage}
            </p>
          ) : null}
        </div>
      </div>
    );
  }
}
