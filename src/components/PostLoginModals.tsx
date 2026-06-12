"use client";

import { useState, useEffect } from "react";
import { useLang } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { X, FileText, Shield, AlertTriangle } from "lucide-react";
import { privacySections, termsSections, disclaimerSections } from "@/lib/legal-content";

export default function PostLoginModals() {
  const { t, lang } = useLang();
  const { user, token, termsAccepted, needsUsernameSetup, acceptTerms, setNeedsUsernameSetup, updateUser } = useAuth();

  const [showTerms, setShowTerms] = useState(false);
  const [showUsernameSetup, setShowUsernameSetup] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedDisclaimer, setAgreedDisclaimer] = useState(false);
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [termsLoading, setTermsLoading] = useState(false);
  const [termsError, setTermsError] = useState("");
  const [showContent, setShowContent] = useState<"privacy" | "terms" | "disclaimer" | null>(null);

  // Check on mount and when user/token changes
  useEffect(() => {
    if (user && token) {
      if (!termsAccepted) {
        setShowTerms(true);
        setShowUsernameSetup(false);
      } else if (needsUsernameSetup) {
        setShowTerms(false);
        setShowUsernameSetup(true);
      } else {
        setShowTerms(false);
        setShowUsernameSetup(false);
      }
    } else {
      setShowTerms(false);
      setShowUsernameSetup(false);
    }
  }, [user, token, termsAccepted, needsUsernameSetup]);

  const handleAcceptTerms = async () => {
    if (!agreedPrivacy || !agreedTerms || !agreedDisclaimer) return;
    setTermsLoading(true);
    setTermsError("");
    try {
      const ok = await acceptTerms();
      if (ok) {
        setShowTerms(false);
        // Check if needs username setup
        if (needsUsernameSetup) {
          setShowUsernameSetup(true);
        }
      } else {
        setTermsError(t("networkError") || "请求失败，请重试");
      }
    } catch (e: any) {
      setTermsError(e.message || t("networkError") || "网络错误，请重试");
    } finally {
      setTermsLoading(false);
    }
  };

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameError("");
    const trimmed = username.trim();
    if (!trimmed || trimmed === "User") {
      setUsernameError(t("usernameInvalid") || "请输入有效的用户名");
      return;
    }
    setUsernameLoading(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
      const resp = await fetch(`${API_BASE}/api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: trimmed }),
      });
      const data = await resp.json();
      if (data.success) {
        setShowUsernameSetup(false);
        setNeedsUsernameSetup(false);
        // Update user in context
        if (data.user) {
          updateUser(data.user);
        }
      } else {
        setUsernameError(data.error || t("failed") || "Failed");
      }
    } catch (e: any) {
      setUsernameError(e.message || t("networkError") || "网络错误");
    } finally {
      setUsernameLoading(false);
    }
  };

  if (!showTerms && !showUsernameSetup) return null;

  return (
    <>
      {/* Terms Modal */}
      {showTerms && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
          <div className="w-full max-w-md mx-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-6 pb-4 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[var(--color-text)]">
                    {t("termsTitle") || "使用条款确认"}
                  </h2>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    {t("termsSubtitle") || "请阅读并同意以下条款以继续使用"}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-3">
              {/* Privacy Policy */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                <input
                  type="checkbox"
                  checked={agreedPrivacy}
                  onChange={(e) => setAgreedPrivacy(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-[var(--color-border)] text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
                <div className="flex-1">
                  <span className="text-sm text-[var(--color-text)]">
                    {t("agreePrivacy") || "我已阅读并同意"}{" "}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowContent("privacy");
                      }}
                      className="text-blue-600 dark:text-blue-400 hover:underline font-medium bg-transparent border-none cursor-pointer p-0"
                    >
                      {t("privacyPolicy") || "隐私政策"}
                    </button>
                  </span>
                </div>
              </label>

              {/* Terms of Service */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                <input
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-[var(--color-border)] text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
                <div className="flex-1">
                  <span className="text-sm text-[var(--color-text)]">
                    {t("agreeTerms") || "我已阅读并同意"}{" "}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowContent("terms");
                      }}
                      className="text-blue-600 dark:text-blue-400 hover:underline font-medium bg-transparent border-none cursor-pointer p-0"
                    >
                      {t("termsOfService") || "服务条款"}
                    </button>
                  </span>
                </div>
              </label>

              {/* Disclaimer */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                <input
                  type="checkbox"
                  checked={agreedDisclaimer}
                  onChange={(e) => setAgreedDisclaimer(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-[var(--color-border)] text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
                <div className="flex-1">
                  <span className="text-sm text-[var(--color-text)]">
                    {t("agreeDisclaimer") || "我已阅读并同意"}{" "}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowContent("disclaimer");
                      }}
                      className="text-blue-600 dark:text-blue-400 hover:underline font-medium bg-transparent border-none cursor-pointer p-0"
                    >
                      {t("disclaimer") || "免责声明"}
                    </button>
                  </span>
                </div>
              </label>
            </div>

            {/* Footer */}
            <div className="p-6 pt-4 border-t border-[var(--color-border)] flex flex-col gap-3">
              {termsError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-sm">
                  {termsError}
                </div>
              )}
              <button
                onClick={handleAcceptTerms}
                disabled={!agreedPrivacy || !agreedTerms || !agreedDisclaimer || termsLoading}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[var(--color-primary)] text-[var(--color-bg)] text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {termsLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>{t("analyzing") || "处理中..."}</span>
                  </>
                ) : (
                  t("acceptTermsBtn") || "同意并继续"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Username Setup Modal */}
      {showUsernameSetup && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 pb-4 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[var(--color-text)]">
                    {t("setupUsername") || "设置用户名"}
                  </h2>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    {t("setupUsernameHint") || "请设置一个用户名以继续使用"}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleUsernameSubmit} className="p-6 space-y-4">
              {usernameError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-sm">
                  {usernameError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1.5 text-[var(--color-text)]">
                  {t("username") || "用户名"}
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t("usernamePlaceholder") || "请输入用户名"}
                  className="w-full px-3.5 py-2.5 rounded-xl border transition-colors bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)]/30"
                  autoFocus
                  required
                />
              </div>
              <button
                type="submit"
                disabled={usernameLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-[var(--color-primary)] text-[var(--color-bg)] text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-all"
              >
                {usernameLoading ? "..." : (t("confirm") || "确认")}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Content viewer overlay */}
      {showContent && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowContent(null)}>
          <div className="w-full max-w-lg mx-4 max-h-[80vh] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--color-text)]">
                {showContent === "privacy" && (t("privacyPolicy") || "隐私政策")}
                {showContent === "terms" && (t("termsOfService") || "服务条款")}
                {showContent === "disclaimer" && (t("disclaimer") || "免责声明")}
              </h3>
              <button
                onClick={() => setShowContent(null)}
                className="p-1.5 rounded-lg hover:bg-[var(--color-bg)] text-[var(--color-text-secondary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto text-sm text-[var(--color-text)] leading-relaxed space-y-3">
              {showContent === "privacy" && (
                <div className="space-y-6">
                  {(privacySections as any)[lang]?.map((section: any, i: number) => (
                    <div key={i}>
                      <h4 className="mb-2 text-base font-semibold text-[var(--color-text)]">
                        {i + 1}. {section.title}
                      </h4>
                      <p className="text-[var(--color-text-secondary)] leading-relaxed">
                        {section.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {showContent === "terms" && (
                <div className="space-y-6">
                  {(termsSections as any)[lang]?.map((section: any, i: number) => (
                    <div key={i}>
                      <h4 className="mb-2 text-base font-semibold text-[var(--color-text)]">
                        {i + 1}. {section.title}
                      </h4>
                      <p className="text-[var(--color-text-secondary)] leading-relaxed">
                        {section.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {showContent === "disclaimer" && (
                <div className="space-y-6">
                  {(disclaimerSections as any)[lang]?.map((section: any, i: number) => (
                    <div key={i}>
                      <h4 className="mb-2 text-base font-semibold text-[var(--color-text)]">
                        {i + 1}. {section.title}
                      </h4>
                      <p className="text-[var(--color-text-secondary)] leading-relaxed">
                        {section.content}
                      </p>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-[var(--color-border)] text-xs text-[var(--color-text-secondary)]">
                    {t("disclaimerAgreement") || '点击"我已了解并同意"即表示您理解并同意上述条款。'}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-[var(--color-border)] flex justify-end">
              <button
                onClick={() => setShowContent(null)}
                className="py-2 px-5 rounded-xl bg-[var(--color-primary)] text-[var(--color-bg)] text-sm font-semibold hover:opacity-90 transition-all"
              >
                {t("close") || "关闭"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
