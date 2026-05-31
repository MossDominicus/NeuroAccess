"use client";

import { useLang } from "@/lib/language-context";

export default function PublicPreviewFooter() {
  const { t } = useLang();

  const openDisclaimer = (e: React.MouseEvent) => {
    e.preventDefault();
    (window as any).__openDisclaimerModal?.();
  };

  return (
    <footer className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)]/50 px-6 py-3 text-center text-xs text-[var(--color-text-secondary)]">
      <p>
        {t("publicPreviewText")}
        <button
          onClick={openDisclaimer}
          className="ml-2 underline hover:text-[var(--color-primary)] cursor-pointer bg-transparent border-none p-0 text-inherit"
        >
          {t("disclaimerTitle")}
        </button>
        <span className="mx-1">·</span>
        <a href="/privacy" className="underline hover:text-[var(--color-primary)]">{t("privacyPolicy")}</a>
        <span className="mx-1">·</span>
        <a href="/terms" className="underline hover:text-[var(--color-primary)]">{t("termsOfService")}</a>
      </p>
    </footer>
  );
}
