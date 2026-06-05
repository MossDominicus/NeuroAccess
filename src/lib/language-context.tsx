"use client";

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { getText, Lang } from "@/lib/translations";

const LANGUAGES: Lang[] = ["zh", "en", "es", "fr", "de", "ja", "ko"];

type LangContextType = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  t: (key: string) => string;
};

const LangContext = createContext<LangContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // Mount 后检测：优先 localStorage，否则默认英文
  useEffect(() => {
    try {
      const saved = localStorage.getItem("neuroaccess-language");
      if (saved && LANGUAGES.includes(saved as Lang)) {
        setLangState(saved as Lang);
      }
      // 无保存语言时保持默认英文，不根据系统语言自动切换
    } catch {}
  }, []);

  // 语言变化时写入 localStorage
  useEffect(() => {
    try {
      localStorage.setItem("neuroaccess-language", lang);
    } catch {}
  }, [lang]);

  // 循环切换语言
  const toggleLang = () => {
    setLangState((prev) => {
      const idx = LANGUAGES.indexOf(prev);
      return LANGUAGES[(idx + 1) % LANGUAGES.length];
    });
  };

  const value = useMemo<LangContextType>(
    () => ({
      lang,
      setLang: setLangState,
      toggleLang,
      t: (key: string) => getText(lang, key),
    }),
    [lang],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextType {
  const ctx = useContext(LangContext);
  if (!ctx) {
    // SSR fallback: return default en context without throwing
    return {
      lang: "en",
      setLang: () => {},
      toggleLang: () => {},
      t: (key: string) => getText("en", key),
    };
  }
  return ctx;
}
