"use client";

import { useLang } from "@/lib/language-context";

export default function PublicPreviewFooter() {
  const { t } = useLang();

  return (
    <footer className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)]/50 px-6 py-3 text-center text-xs text-[var(--color-text-secondary)]">
      <div className="flex items-center justify-center gap-2">
        <a href="/disclaimer" className="underline hover:text-[var(--color-primary)] transition-colors">
          {t("disclaimerTitle")}
        </a>
        <span className="text-[var(--color-border)]">·</span>
        <a href="/privacy" className="underline hover:text-[var(--color-primary)] transition-colors">
          {t("privacyPolicy")}
        </a>
        <span className="text-[var(--color-border)]">·</span>
        <a href="/terms" className="underline hover:text-[var(--color-primary)] transition-colors">
          {t("termsOfService")}
        </a>
      </div>
    </footer>
  );
}
