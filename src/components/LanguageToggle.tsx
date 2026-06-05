"use client";

import { useLang } from "@/lib/language-context";

export default function LanguageToggle() {
  const { lang, toggleLang, t } = useLang();

  return (
    <button
      onClick={toggleLang}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
        bg-gray-100 dark:bg-[var(--color-surface)] text-gray-600 dark:text-[var(--color-text-secondary)] hover:bg-gray-200 dark:hover:bg-[var(--color-border)] border border-transparent dark:border-[var(--color-border)]"
      title={t("langSwitch")}
    >
      <span className={lang === "zh" ? "text-gray-900 dark:text-[var(--color-text)] font-semibold" : "text-[var(--color-text-secondary)] dark:text-[var(--color-text-secondary)]"}>{t("chinese")}</span>
      <span className="text-[var(--color-text-secondary)] dark:text-[var(--color-text-secondary)]">/</span>
      <span className={lang === "en" ? "text-gray-900 dark:text-[var(--color-text)] font-semibold" : "text-[var(--color-text-secondary)] dark:text-[var(--color-text-secondary)]"}>{t("english")}</span>
    </button>
  );
}
