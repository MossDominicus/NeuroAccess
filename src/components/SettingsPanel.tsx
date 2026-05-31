"use client";

import { useEffect, useState, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/lib/language-context";
import { useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import { Settings, Moon, Sun, Monitor, User, X, LogOut, Eye, EyeOff, Key, ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import FeedbackPanel from "@/components/FeedbackPanel";

type SettingsPanelProps = {
  open: boolean;
  onClose: () => void;
};

export default function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { lang, setLang, t } = useLang();
  const { theme, setTheme } = useTheme();
  const { user, token, logout, updateUser } = useAuth();

  // Password change state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [apiCode, setApiCode] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loadingCode, setLoadingCode] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [countdown, setCountdown] = useState(0);
  // Edit profile state
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";





  // Countdown timer for resend cooldown
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const fetchVerificationCode = async () => {
    if (!token || countdown > 0) return;
    setLoadingCode(true);
    setPwError("");
    setPwSuccess("");
    try {
      const resp = await fetch(`${API_BASE}/api/auth/verification-code`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (resp.status === 429) {
        // Parse remaining seconds from detail message if possible
        const match = data.detail?.match(/(\d+)/);
        const seconds = match ? parseInt(match[1], 10) : 60;
        setCountdown(seconds);
        setPwError(t("resendAfter")?.replace("{seconds}", String(seconds)) || `${seconds}s后可重发`);
      } else if (data.success) {
        setApiCode(null); // backend no longer returns code
        setPwSuccess(t("codeSentToEmail") || "Verification code sent to your email, valid for 10 minutes");
        setCountdown(60);
      } else {
        setPwError(data.error || t("failedToGenerateCode") || "Failed to generate code");
      }
    } catch (e: any) {
      setPwError(e.message || t("networkError") || "Network error");
    } finally {
      setLoadingCode(false);
    }
  };

  const submitPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");
    if (newPassword !== confirmPassword) {
      setPwError(t("passwordMismatch") || "密码不一致");
      return;
    }
    if (newPassword.length < 6) {
      setPwError(t("passwordTooShort") || "密码至少6位");
      return;
    }
    if (!token) {
      setPwError(t("notAuthenticated") || "未登录");
      return;
    }
    setLoadingSubmit(true);
    try {
      const resp = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          verification_code: verificationCode,
          new_password: newPassword,
        }),
      });
      const data = await resp.json();
      if (data.success) {
        setPwSuccess(t("passwordChanged") || "密码修改成功");
        setVerificationCode("");
        setApiCode(null);
        setNewPassword("");
        setConfirmPassword("");
        setShowNewPassword(false);
      } else {
        setPwError(data.error || t("failedToChangePassword") || "Failed to change password");
      }
    } catch (e: any) {
      setPwError(e.message || t("networkError") || "Network error");
    } finally {
      setLoadingSubmit(false);
    }
  };

  const submitProfileUpdate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setEditError("");
    setEditSuccess("");
    if (!token) {
      setEditError(t("notAuthenticated") || "未登录");
      return;
    }
    setEditLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/auth/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: editUsername, avatar_url: editAvatarUrl }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        setEditError(`Server error ${resp.status}: ${text.substring(0, 200)}`);
        setEditLoading(false);
        return;
      }
      const data = await resp.json();
      if (data.success) {
        setEditSuccess(t("profileUpdated") || "资料更新成功");
        setShowEditProfile(false);
        if (updateUser && data.user) updateUser(data.user);
      } else {
        setEditError(data.error || t("failedToUpdateProfile") || "Failed to update profile");
      }
    } catch (e: any) {
      setEditError(e.message || t("networkError") || "Network error");
    } finally {
      setEditLoading(false);
    }
  };

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
                    {t("ollamaPullHint") || "在终端运行 ollama pull <模型名> 可切换模型"}
                  </p>
                </div>
              </section>

              {/* 账号 */}
              <section>
                <h3 className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
                  {t("account") || "账号"}
                </h3>
                {user ? (
                  <div className="w-full p-3 rounded-xl bg-[var(--color-bg)] space-y-3">
                    {/* Clickable user card — opens edit panel */}
                    <button
                      onClick={() => {
                        const next = !showEditProfile;
                        setShowEditProfile(next);
                        setEditError("");
                        setEditSuccess("");
                        setPwError("");
                        setPwSuccess("");
                        if (next) {
                          setEditUsername(user?.username || "");
                          setEditAvatarUrl(user?.avatar_url || "");
                        }
                      }}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-border)] transition-colors text-left"
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                        style={{ backgroundColor: user?.avatar_url || "#3B82F6" }}
                      >
                        {(user?.username || "?")[0].toUpperCase()}
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--color-text)] truncate">{user.username}</p>
                        <p className="text-xs text-[var(--color-text-secondary)] truncate">{user.email}</p>
                      </div>
                      {showEditProfile ? (
                        <ChevronUp className="w-3.5 h-3.5 text-[var(--color-text-secondary)] shrink-0" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-[var(--color-text-secondary)] shrink-0" />
                      )}
                    </button>

                    {/* Edit Panel — avatar, username, password */}
                    {showEditProfile && (
                      <div className="space-y-4 pt-1">
                        {/* Avatar color picker */}
                        <div className="flex flex-col items-center gap-2">
                          <div
                            className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white"
                            style={{ backgroundColor: editAvatarUrl || "#3B82F6" }}
                          >
                            {(editUsername || user?.username || "?")[0].toUpperCase()}
                          </div>
                          <div className="flex flex-wrap justify-center gap-2">
                            {["#3B82F6", "#10B981", "#8B5CF6", "#EF4444", "#F59E0B", "#06B6D4", "#EC4899", "#84CC16"].map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setEditAvatarUrl(c)}
                                className={`w-6 h-6 rounded-full transition-all ${editAvatarUrl === c ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : "hover:scale-110"}`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                          <p className="text-xs text-[var(--color-text-secondary)]">{t("chooseAvatarColor") || "选择头像颜色"}</p>
                        </div>

                        {/* Username */}
                        <input
                          type="text"
                          value={editUsername}
                          onChange={(e) => setEditUsername(e.target.value)}
                          placeholder={t("username") || "用户名"}
                          className="w-full px-3 py-2 rounded-lg border bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] text-sm focus:outline-none focus:border-gray-400"
                        />

                        {/* Save profile */}
                        <button
                          onClick={submitProfileUpdate}
                          disabled={editLoading}
                          className="w-full py-2 px-3 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-40 transition-colors"
                        >
                          {editLoading ? "..." : (t("save") || "保存资料")}
                        </button>

                        {/* Divider */}
                        <div className="border-t border-[var(--color-border)] pt-3">
                          <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">{t("changePassword") || "修改密码"}</p>

                          {/* Get code */}
                          <div className="flex items-center gap-2 mb-2">
                            <button
                              type="button"
                              onClick={fetchVerificationCode}
                              disabled={loadingCode || countdown > 0}
                              className="flex-1 py-2 px-3 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-40 transition-colors"
                            >
                              {loadingCode ? "..." : countdown > 0 ? `${countdown}s` : (t("getCode") || "获取验证码")}
                            </button>
                          </div>

                          <form onSubmit={submitPasswordChange} className="space-y-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                          placeholder={t("enterCode") || "输入验证码"}
                          className="w-full px-3 py-2 rounded-lg border bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] text-sm focus:outline-none focus:border-gray-400"
                          required
                        />

                        {/* New password */}
                        <div className="relative">
                          <input
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder={t("newPassword") || "新密码"}
                            className="w-full px-3 py-2 pr-10 rounded-lg border bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] text-sm focus:outline-none focus:border-gray-400"
                            required
                            minLength={6}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                            tabIndex={-1}
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>

                        {/* Confirm password */}
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder={t("confirmNewPassword") || "确认新密码"}
                          className="w-full px-3 py-2 rounded-lg border bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] text-sm focus:outline-none focus:border-gray-400"
                          required
                        />

                        {pwError && (
                          <p className="text-xs text-red-500">{pwError}</p>
                        )}
                        {pwSuccess && (
                          <p className="text-xs text-green-500">{pwSuccess}</p>
                        )}

                        <button
                          type="submit"
                          disabled={loadingSubmit}
                          className="w-full py-2 px-3 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-40 transition-colors"
                        >
                          {loadingSubmit ? "..." : (t("confirmChange") || "确认修改")}
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => { logout(); window.location.href = "/"; }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t("logout") || "退出登录"}</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { window.location.href = "/login"; }}
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
                        {t("clickToSignIn") || "点击登录以同步数据"}
                      </p>
                    </div>
                  </button>
                )}
              </section>

              {/* 反馈 */}
              <section>
                <h3 className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
                  {t("feedback") || "反馈"}
                </h3>
                <div className="rounded-xl bg-[var(--color-bg)]">
                  <button
                    onClick={() => setShowFeedback(true)}
                    className="w-full flex items-center justify-between p-3 text-sm text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors rounded-xl"
                  >
                    <span className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-[var(--color-text-secondary)]" />
                      {t("helpImprove") || "帮助改进 NeuroAccess"}
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
                    {t("mobileNotOptimized") || "This website is not optimized for mobile devices."}
                  </p>
                </div>
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
                      {t("projectPositioning") || "项目定位"}
                    </span>
                    <span className="text-sm text-[var(--color-text)] text-right max-w-[60%]">
                      {t("projectDescription") || "EEG 科普教育平台"}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-[var(--color-border)]">
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                      {t("projectDescLong") || "NeuroAccess 是一个面向EEG初学者的科普教育工具，帮助理解脑电图数据的基本概念。本平台不提供医疗诊断建议。"}
                    </p>
                  </div>
                </div>
              </section>
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
            <h2 className="text-sm font-semibold">{t("feedback") || "反馈"}</h2>
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
