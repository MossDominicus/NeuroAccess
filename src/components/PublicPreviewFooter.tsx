"use client";

import { useLang } from "@/lib/language-context";

export default function PublicPreviewFooter() {
  const { t } = useLang();

  return (
    <footer className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)]/50 px-6 py-3 text-center text-xs text-[var(--color-text-secondary)]">
      <p>
        {t("publicPreviewText")}
        <a href="#disclaimer" className="ml-2 underline hover:text-[var(--color-primary)]">{t("disclaimerTitle")}</a>
        <span className="mx-1">·</span>
        <a href="/privacy" className="underline hover:text-[var(--color-primary)]">{t("privacyPolicy")}</a>
        <span className="mx-1">·</span>
        <a href="/terms" className="underline hover:text-[var(--color-primary)]">{t("termsOfService")}</a>
      </p>
    </footer>
  );
}
