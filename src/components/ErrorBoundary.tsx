"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: string;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500 dark:text-amber-400 mb-3" />
          <p className="text-sm text-[var(--color-text-secondary)]">
            {this.props.fallback || "Something went wrong. Please refresh the page."}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
