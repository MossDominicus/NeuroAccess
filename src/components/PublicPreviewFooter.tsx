"use client";

import { translations } from "@/lib/translations";

interface PublicPreviewFooterProps {
  lang: string;
}

export default function PublicPreviewFooter({ lang }: PublicPreviewFooterProps) {
  // Helper: get translation directly from translations object (no useLang needed)
  const tf = (key: string, fallback: string) => {
    const val = translations[lang as keyof typeof translations]?.[key];
    return val || fallback;
  };

  return (
    <footer className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)]/50 px-6 py-3 text-center text-xs text-[var(--color-text-secondary)]">
      <div className="flex items-center justify-center gap-2">
        <a href="/disclaimer" className="underline hover:text-[var(--color-primary)] transition-colors">
          {tf("disclaimerTitle", "Disclaimer")}
        </a>
        <span className="text-[var(--color-border)]">·</span>
        <a href="/privacy" className="underline hover:text-[var(--color-primary)] transition-colors">
          {tf("privacyPolicy", "Privacy Policy")}
        </a>
        <span className="text-[var(--color-border)]">·</span>
        <a href="/terms" className="underline hover:text-[var(--color-primary)] transition-colors">
          {tf("termsOfService", "Terms of Service")}
        </a>
      </div>
    </footer>
  );
}
