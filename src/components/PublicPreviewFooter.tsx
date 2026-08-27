"use client";

import { translations } from "@/lib/translations";
import { useLang } from "@/lib/language-context";

interface PublicPreviewFooterProps {
  lang?: string;
}

export default function PublicPreviewFooter({ lang: serverLang }: PublicPreviewFooterProps) {
  const { lang: clientLang } = useLang();
  const lang = serverLang || clientLang;
  // Helper: get translation directly from translations object
  const tf = (key: string, fallback: string) => {
    const val = translations[lang as keyof typeof translations]?.[key];
    return val || fallback;
  };

  return (
    <footer className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)]/50 px-6 py-3 text-center text-xs text-[var(--color-text-secondary)]">
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {/* 原生 <a> 全页导航，避免 next/link 客户端路由在该环境不提交导致链接点不动 */}
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
