"use client";

import { useRouter } from "next/navigation";
import { useLang } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { getDisplayInitial } from "@/lib/display-initial";

interface TopNavProps {
  lang?: string;
}

// 根据 lang 直接返回翻译（SSR 期间 useLang() 返回默认值 en，不能用 t()）
const getLoginText = (lang: string): string => {
  const map: Record<string, string> = {
    zh: "登录",
    en: "Login",
    es: "Iniciar sesión",
    fr: "Connexion",
    de: "Anmelden",
    ja: "ログイン",
    ko: "로그인",
  };
  return map[lang] || map.en;
};

export default function TopNav({ lang: serverLang }: TopNavProps) {
  const { t, lang: clientLang } = useLang();
  const { user } = useAuth();
  const router = useRouter();

  // SSR 期间 serverLang 正确，客户端水合后 clientLang 正确
  const lang = serverLang || clientLang;

  const avatarColor = user?.avatar_url || "#3B82F6";

  return (
    <header className="h-14 bg-[var(--color-surface)]/80 backdrop-blur-xl border-b border-[var(--color-border)] flex items-center justify-between px-6 sticky top-0 z-40">
      {/* Left: logo */}
      <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
        <span className="text-sm font-semibold text-[var(--color-text)]">NeuroAccess</span>
        <span className="text-xs text-[var(--color-text-secondary)]">v1.3</span>
      </a>

      {/* Right: user avatar */}
      <div>
        {user ? (
          <button
            onClick={() => router.push("/account")}
            className="flex items-center gap-2 p-1.5 rounded-full hover:bg-[var(--color-border)] transition-colors"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ backgroundColor: avatarColor }}
            >
              {getDisplayInitial(user?.username || "?")}
            </div>
          </button>
        ) : (
          <a
            href="/login"
            className="text-xs text-[var(--color-primary)] hover:opacity-80 transition-opacity"
          >
            {getLoginText(lang)}
          </a>
        )}
      </div>
    </header>
  );
}
