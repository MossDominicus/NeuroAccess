"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/lib/language-context";
import { useTheme } from "@/lib/theme-context";
import { Settings, Moon, Sun, Monitor, User, X } from "lucide-react";

type SettingsPanelProps = {
  open: boolean;
  onClose: () => void;
};

export default function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { lang, setLang, t } = useLang();
  const { theme, setTheme } = useTheme();

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

  return (
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
                {t("settings") || "设置"}
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
                  {t("theme") || "主题"}
                </h3>
                <div className="space-y-1">
                  <ThemeOption
                    icon={<Sun className="w-4 h-4" />}
                    label={t("lightMode") || "浅色"}
                    active={theme === "light"}
                    onClick={() => setTheme("light")}
                  />
                  <ThemeOption
                    icon={<Moon className="w-4 h-4" />}
                    label={t("darkMode") || "深色"}
                    active={theme === "dark"}
                    onClick={() => setTheme("dark")}
                  />
                  <ThemeOption
                    icon={<Monitor className="w-4 h-4" />}
                    label={t("systemMode") || "跟随系统"}
                    active={theme === "system"}
                    onClick={() => setTheme("system")}
                  />
                </div>
              </section>

              {/* 语言 */}
              <section>
                <h3 className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
                  {t("language") || "语言"}
                </h3>
                <div className="grid grid-cols-2 gap-1.5">
                  <LangBtn code="zh" label="中文" active={lang === "zh"} onClick={() => setLang("zh")} />
                  <LangBtn code="en" label="English" active={lang === "en"} onClick={() => setLang("en")} />
                  <LangBtn code="es" label="Español" active={lang === "es"} onClick={() => setLang("es")} />
                  <LangBtn code="fr" label="Français" active={lang === "fr"} onClick={() => setLang("fr")} />
                  <LangBtn code="de" label="Deutsch" active={lang === "de"} onClick={() => setLang("de")} />
                  <LangBtn code="ja" label="日本語" active={lang === "ja"} onClick={() => setLang("ja")} />
                  <LangBtn code="ko" label="한국어" active={lang === "ko"} onClick={() => setLang("ko")} />
                </div>
              </section>

              {/* Ollama 模型 */}
              <section>
                <h3 className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
                  {t("ollamaModel") || "Ollama 模型"}
                </h3>
                <div className="rounded-xl bg-[var(--color-bg)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                  qwen2.5:7b
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)] opacity-60">
                    {lang === "zh" ? "在终端运行 ollama pull <模型名> 可切换模型" : "Run ollama pull <model> in terminal to switch"}
                  </p>
                </div>
              </section>

              {/* 账号 */}
              <section>
                <h3 className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
                  {t("account") || "账号"}
                </h3>
                <button
                  onClick={() => {
                    alert(t("notLoggedIn") || "暂未登录");
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-[var(--color-bg)] hover:bg-[var(--color-border)] transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-[var(--color-text)]">
                      {t("notLoggedIn") || "暂未登录"}
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {lang === "zh" ? "点击登录以同步数据" : "Click to sign in & sync"}
                    </p>
                  </div>
                </button>
              </section>

              {/* 关于 */}
              <section>
                <h3 className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
                  {t("about") || "关于"}
                </h3>
                <div className="rounded-xl bg-[var(--color-bg)] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--color-text-secondary)]">
                      {t("version") || "版本"}
                    </span>
                    <span className="text-sm font-mono text-[var(--color-text)]">v1.0.0</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--color-text-secondary)]">
                      {lang === "zh" ? "项目定位" : "Project"}
                    </span>
                    <span className="text-sm text-[var(--color-text)] text-right max-w-[60%]">
                      {lang === "zh" ? "EEG 科普教育平台" : "EEG Education Platform"}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-[var(--color-border)]">
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                      {lang === "zh"
                        ? "NeuroAccess 是一个面向EEG初学者的科普教育工具，帮助理解脑电图数据的基本概念。本平台不提供医疗诊断建议。"
                        : "NeuroAccess is an EEG education tool for beginners to understand basic EEG concepts. This platform does not provide medical diagnostic advice."}
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
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
