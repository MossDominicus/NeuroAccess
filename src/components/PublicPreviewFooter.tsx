"use client";

import { translations } from "@/lib/translations";
import { useLang } from "@/lib/language-context";
import Link from "next/link";

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
        <Link href="/disclaimer" className="underline hover:text-[var(--color-primary)] transition-colors">
          {tf("disclaimerTitle", "Disclaimer")}
        </Link>
        <span className="text-[var(--color-border)]">·</span>
        <Link href="/privacy" className="underline hover:text-[var(--color-primary)] transition-colors">
          {tf("privacyPolicy", "Privacy Policy")}
        </Link>
        <span className="text-[var(--color-border)]">·</span>
        <Link href="/terms" className="underline hover:text-[var(--color-primary)] transition-colors">
          {tf("termsOfService", "Terms of Service")}
        </Link>
        <span className="text-[var(--color-border)]">·</span>
        <Link href="/schools" className="underline hover:text-[var(--color-primary)] transition-colors">
          {tf("freeForSchools", "Free for Schools")}
        </Link>
      </div>
    </footer>
  );
}
