"use client";

import { useRouter } from "next/navigation";
import { useLang } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";

export default function TopNav() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const router = useRouter();

  const avatarColor = user?.avatar_url || "#3B82F6";

  return (
    <header className="h-14 bg-[var(--color-surface)]/80 backdrop-blur-xl border-b border-[var(--color-border)] flex items-center justify-between px-6 sticky top-0 z-40">
      {/* Left: logo */}
      <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
        <span className="text-sm font-semibold text-[var(--color-text)]">NeuroAccess</span>
        <span className="text-xs text-[var(--color-text-secondary)]">v1.0</span>
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
              {(user?.username || "?")[0].toUpperCase()}
            </div>
          </button>
        ) : (
          <a
            href="/login"
            className="text-xs text-[var(--color-primary)] hover:opacity-80 transition-opacity"
          >
            {t("login") || "登录"}
          </a>
        )}
      </div>
    </header>
  );
}
