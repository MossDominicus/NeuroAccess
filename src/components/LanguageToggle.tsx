"use client";

import { useLang } from "@/lib/language-context";

export default function LanguageToggle() {
  const { lang, toggleLang, t } = useLang();

  return (
    <button
      onClick={toggleLang}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
        bg-gray-100 text-gray-600 hover:bg-gray-200"
      title={t("langSwitch")}
    >
      <span className={lang === "zh" ? "text-gray-900 font-semibold" : "text-gray-400"}>中文</span>
      <span className="text-gray-300">/</span>
      <span className={lang === "en" ? "text-gray-900 font-semibold" : "text-gray-400"}>EN</span>
    </button>
  );
}
