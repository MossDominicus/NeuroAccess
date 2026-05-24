"use client";

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { getText, Lang } from "@/lib/translations";

type LangContextType = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  t: (key: string) => string;
};

const LangContext = createContext<LangContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // 初始值 "en"，避免 SSR 不匹配
  const [lang, setLangState] = useState<Lang>("en");

  // Mount 后从 localStorage 读取保存的语言
  useEffect(() => {
    try {
      const saved = localStorage.getItem("neuroaccess-language");
      if (saved === "zh" || saved === "en") {
        setLangState(saved);
      }
    } catch {}
  }, []);

  // 语言变化时写入 localStorage
  useEffect(() => {
    try {
      localStorage.setItem("neuroaccess-language", lang);
    } catch {}
  }, [lang]);

  const value = useMemo<LangContextType>(
    () => ({
      lang,
      setLang: setLangState,
      toggleLang: () => setLangState((prev) => (prev === "zh" ? "en" : "zh")),
      t: (key: string) => getText(lang, key),
    }),
    [lang],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextType {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}
