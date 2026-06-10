"use client";

import { useEffect, useState, useRef, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/lib/language-context";
import { useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import { Settings, Moon, Sun, Monitor, User, X, Eye, Key, MessageSquare, CheckCircle2, AlertTriangle, Cpu } from "lucide-react";
const FeedbackPanel = dynamic(() => import("@/components/FeedbackPanel"), { ssr: false, loading: () => null });

type SettingsPanelProps = {
  open: boolean;
  onClose: () => void;
};

export default function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { lang, setLang, t } = useLang();
  const { theme, setTheme } = useTheme();
  const { user, token, logout, updateUser } = useAuth();

  const [showFeedback, setShowFeedback] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState("");
  const [deleteCountdown, setDeleteCountdown] = useState(0);

  const [aiStatus, setAiStatus] = useState<{ online: boolean; model: string; mode: string } | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";





  // 点击遮罩关闭
  function handleOverlay(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // AI 状态
  useEffect(() => {
    if (!open) return;
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/health");
        const data = await res.json();
        setAiStatus({
          online: data.ai_online ?? false,
          model: data.ai_model || "—",
          mode: data.ai_mode || "API",
        });
      } catch {
        setAiStatus({ online: false, model: "—", mode: "API" });
      }
    };
    fetchStatus();
    const id = setInterval(fetchStatus, 30000);
    return () => clearInterval(id);
  }, [open]);

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex"
            onClick={handleOverlay}
          >
          {/* 遮罩 */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* 面板：从左侧滑入 */}
          <motion.aside
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="relative z-10 w-80 max-w-full h-full bg-[var(--color-surface)] border-r border-[var(--color-border)] shadow-2xl flex flex-col"
          >
            {/* 标题栏 */}
            <div className="flex items-center justify-between px-5 h-14 border-b border-[var(--color-border)]">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Settings className="w-4 h-4" />
                {t("settings")}
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-[var(--color-bg)] transition-colors"
              >
                <X className="w-4 h-4 text-[var(--color-text-secondary)]" />
              </button>
            </div>

            {/* 内容区 */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* 主题 */}
              <section>
                <h3 className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
                  {t("theme")}
                </h3>
                <div className="space-y-1">
                  <ThemeOption
                    icon={<Sun className="w-4 h-4" />}
                    label={t("lightMode")}
                    active={theme === "light"}
                    onClick={() => setTheme("light")}
                  />
                  <ThemeOption
                    icon={<Moon className="w-4 h-4" />}
                    label={t("darkMode")}
                    active={theme === "dark"}
                    onClick={() => setTheme("dark")}
                  />
                  <ThemeOption
                    icon={<Monitor className="w-4 h-4" />}
                    label={t("systemMode")}
                    active={theme === "system"}
                    onClick={() => setTheme("system")}
                  />
                </div>
              </section>

              {/* 语言 */}
              <section>
                <h3 className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
                  {t("language")}
                </h3>
                <div className="grid grid-cols-2 gap-1.5">
                  <LangBtn code="en" label="English" active={lang === "en"} onClick={() => setLang("en")} />
                  <LangBtn code="zh" label="中文" active={lang === "zh"} onClick={() => setLang("zh")} />
                  <LangBtn code="es" label="Español" active={lang === "es"} onClick={() => setLang("es")} />
                  <LangBtn code="fr" label="Français" active={lang === "fr"} onClick={() => setLang("fr")} />
                  <LangBtn code="de" label="Deutsch" active={lang === "de"} onClick={() => setLang("de")} />
                  <LangBtn code="ja" label="日本語" active={lang === "ja"} onClick={() => setLang("ja")} />
                  <LangBtn code="ko" label="한국어" active={lang === "ko"} onClick={() => setLang("ko")} />
                </div>
              </section>

              {/* 反馈 */}
              <section>
                <h3 className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
                  {t("feedback")}
                </h3>
                <div className="rounded-xl bg-[var(--color-bg)]">
                  <button
                    onClick={() => setShowFeedback(true)}
                    className="w-full flex items-center justify-between p-3 text-sm text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors rounded-xl"
                  >
                    <span className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-[var(--color-text-secondary)]" />
                      {t("helpImprove")}
                    </span>
                    <span className="text-xs text-[var(--color-text-secondary)]">{t("clickToOpen") || "点击打开"}</span>
                  </button>
                </div>
              </section>

              {/* 移动端提示 */}
              <section>
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 flex items-start gap-3">
                  <Monitor className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                    {t("mobileNotOptimized")}
                  </p>
                </div>
              </section>

              {/* 关于 */}
              <section>
                <h3 className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
                  {t("about")}
                </h3>
                <div className="rounded-xl bg-[var(--color-bg)] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--color-text-secondary)]">
                      {t("version")}
                    </span>
                    <span className="text-sm font-mono text-[var(--color-text)]">v1.3.0</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--color-text-secondary)]">
                      {t("projectPositioning")}
                    </span>
                    <span className="text-sm text-[var(--color-text)] text-right max-w-[60%]">
                      {t("projectDescription")}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-[var(--color-border)]">
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                      {t("projectDescLong")}
                    </p>
                  </div>
                </div>
              </section>

              {/* AI 状态 — 仅未登录时显示 */}
              {!token && aiStatus && (
                <section>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-secondary)] border-t border-[var(--color-border)] pt-4">
                    <div className="flex items-center gap-1.5">
                      {aiStatus.online ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                      )}
                      <span className={aiStatus.online ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
                        {aiStatus.online ? t("aiOnline") : t("aiOffline")}
                      </span>
                    </div>
                    {aiStatus.online && (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        <span>{aiStatus.model}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5" />
                      <span>{aiStatus.mode}</span>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Feedback Modal — portal to document.body */}
    {showFeedback && typeof document !== 'undefined' && createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowFeedback(false)} />
        <div className="relative z-10 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto bg-[var(--color-surface)] rounded-2xl shadow-2xl border border-[var(--color-border)]">
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 h-14 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
            <h2 className="text-sm font-semibold">{t("feedback")}</h2>
            <button onClick={() => setShowFeedback(false)} className="p-1.5 rounded-lg hover:bg-[var(--color-bg)] transition-colors">
              <X className="w-4 h-4 text-[var(--color-text-secondary)]" />
            </button>
          </div>
          <div className="p-5">
            <FeedbackPanel />
          </div>
        </div>
      </div>,
      document.body
    )}
  </>)
}



function ThemeOption({
  icon,
  label,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
        active
          ? "bg-gray-900 text-white shadow-lg shadow-gray-900/10"
          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]"
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

function LangBtn({
  code,
  label,
  active,
  onClick,
}: {
  code: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
        active
          ? "bg-gray-900 text-white shadow-lg shadow-gray-900/10"
          : "bg-[var(--color-bg)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-border)]"
      }`}
    >
      <span className="block text-[10px] opacity-60 uppercase leading-none mb-0.5">{code}</span>
      <span>{label}</span>
    </button>
  );
}
