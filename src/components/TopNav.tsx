"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSyncExternalStore, useCallback } from "react";
import { Loader2, Menu, X, LayoutDashboard, FileText, BookOpen, Stethoscope, Activity, Settings } from "lucide-react";
const SettingsPanel = dynamic(() => import("./SettingsPanel"), { ssr: false, loading: () => null });
import { useLang } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { useAppEvents } from "@/lib/app-events";
import { getDisplayInitial } from "@/lib/display-initial";
import { EEGGenerationManager as gen } from "@/lib/eeg-generation-manager";

interface TopNavProps {
  lang?: string;
}

const mobileMenuItems = [
  { key: "dashboard", href: "/", icon: LayoutDashboard },
  { key: "reports", href: "/reports", icon: FileText },
  { key: "sidebarGuide", href: "/guide", icon: BookOpen },
  { key: "cases", href: "/cases", icon: Stethoscope },
  { key: "eegSimulator", href: "/eeg-simulator", icon: Activity },
];

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
  const pathname = usePathname();
  const router = useRouter();

  // SSR 期间 serverLang 正确，客户端水合后 clientLang 正确
  const lang = serverLang || clientLang;

  const avatarColor = user?.avatar_color || "#3B82F6";

  // ── 后台任务状态 ─────────────────────────────────────────────────
  const genState = useSyncExternalStore(
    useCallback((cb: () => void) => gen.subscribe(cb), []),
    () => gen.getState(),
    () => ({ status: "idle", progress: 0 }),
  );
  const isGenRunning = genState.status === "running";

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
    <header className="h-14 bg-[var(--color-surface)]/80 backdrop-blur-xl border-b border-[var(--color-border)] flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40">
      {/* Left: hamburger + logo */}
      <div className="flex items-center gap-3">
        {/* 移动端菜单按钮 — lg以上隐藏 */}
        {user && (
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-[var(--color-bg)] transition-colors text-[var(--color-text-secondary)]"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <span className="text-sm font-semibold text-[var(--color-text)]">NeuroAccess</span>
          <span className="text-xs text-[var(--color-text-secondary)]">v2.0</span>
        </Link>

        {/* Background task indicator */}
        {isGenRunning && (
          <Link href="/eeg-simulator"
            className="flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-2.5 py-1 text-xs text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="hidden sm:inline">EEG</span>
            <span>{genState.progress}%</span>
          </Link>
        )}
      </div>

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
            onClick={(e) => {
              e.preventDefault();
              window.location.href = "/login";
            }}
            className="text-xs text-[var(--color-primary)] hover:opacity-80 transition-opacity cursor-pointer"
          >
            {getLoginText(lang)}
          </a>
        )}
      </div>
    </header>

    {/* 移动端导航面板 — 始终渲染，用 translate 控制显隐 */}
    <div className={`fixed inset-0 z-50 lg:hidden transition-all duration-250 ease-out ${
      mobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"
    }`}>
      {/* 遮罩 */}
      <div className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-250 ${
        mobileMenuOpen ? "opacity-100" : "opacity-0"
      }`} onClick={() => setMobileMenuOpen(false)} />
      {/* 面板 */}
      <div className={`relative z-10 w-72 max-w-[80vw] h-full bg-[var(--color-surface)] shadow-2xl flex flex-col transition-transform duration-250 ease-out ${
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
          <div className="flex items-center justify-between h-14 px-4 border-b border-[var(--color-border)]">
            <span className="text-sm font-semibold text-[var(--color-text)]">NeuroAccess</span>
            <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 rounded-lg hover:bg-[var(--color-bg)] transition-colors">
              <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {mobileMenuItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                        isActive
                          ? "bg-[var(--color-primary)] text-[var(--color-surface)]"
                          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]"
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium">{t(item.key)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          {/* 移动端设置按钮 */}
          <div className="p-4 border-t border-[var(--color-border)]">
            <button
              onClick={() => { setMobileMenuOpen(false); setSettingsOpen(true); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)] transition-colors"
            >
              <Settings className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">{t("settings")}</span>
            </button>
          </div>
      </div>
    </div>

    {/* 设置面板 — 在 TopNav 渲染，避免被 Sidebar 的 hidden 类隐藏 */}
    {settingsOpen && <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />}
  </>
);
}
