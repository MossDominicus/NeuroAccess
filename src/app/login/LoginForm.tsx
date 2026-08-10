"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/language-context";
import Link from "next/link";
import { translations } from "@/lib/translations";
import AuthSettingsBar from "@/components/AuthSettingsBar";
import CaptchaModal from "@/components/CaptchaModal";

interface LoginFormProps {
  lang: string;
}

export default function LoginForm({ lang }: LoginFormProps) {
  const router = useRouter();
  const { login, sendLoginCode, loginWithCode, token } = useAuth();
  const { lang: ctxLang } = useLang();
  const effectiveLang = ctxLang || lang;

  // 已登录则重定向到首页
  useEffect(() => {
    if (token) {
      router.push("/"); setTimeout(() => { window.location.replace("/"); }, 800);
    }
  }, [token]);

  // ── Password mode state ──
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // ── Code mode state ──
  const [useCode, setUseCode] = useState(false);
  const [codeEmail, setCodeEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeCountdown, setCodeCountdown] = useState(0);
  const [codeSending, setCodeSending] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sendingRef = useRef(false);

  // ── Shared state ──
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // ── 人机验证（数学验证码） ──
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const pendingLoginRef = useRef<{ type: "password" | "code"; args: Record<string, string> } | null>(null);

  // Cleanup countdown
  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, []);

  // ── Helper ──
  const tf = (key: string, fallback: string) => {
    const val = translations[effectiveLang as keyof typeof translations]?.[key];
    return val || fallback;
  };

  // ── Password submit ──
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await login(usernameOrEmail, password);
      if (result.success) {
        router.push("/"); setTimeout(() => { window.location.replace("/"); }, 800);
      } else if (result.needsCaptcha) {
        pendingLoginRef.current = { type: "password", args: { usernameOrEmail, password } };
        setCaptchaOpen(true);
      } else {
        setError(result.error || tf("loginFailed", "Login failed"));
      }
    } catch (err: any) {
      setError(err.message || tf("networkErrorMsg", "Network error"));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Code submit ──
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await loginWithCode(codeEmail, code);
      if (result.success) {
        router.push("/"); setTimeout(() => { window.location.replace("/"); }, 800);
      } else if (result.needsCaptcha) {
        pendingLoginRef.current = { type: "code", args: { codeEmail, code } };
        setCaptchaOpen(true);
      } else {
        setError(result.error || tf("verificationCodeFailed", "Verification failed"));
      }
    } catch (err: any) {
      setError(err.message || tf("networkErrorMsg", "Network error"));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Send login code ──
  const handleSendCode = async () => {
    if (!codeEmail.trim() || codeCountdown > 0 || sendingRef.current) return;
    sendingRef.current = true;
    setCodeSending(true);
    setError("");
    try {
      const result = await sendLoginCode(codeEmail.trim());
      if (result.success) {
        setCodeCountdown(60);
        if (countdownRef.current) clearInterval(countdownRef.current);
        countdownRef.current = setInterval(() => {
          setCodeCountdown((prev) => {
            if (prev <= 1) {
              if (countdownRef.current) clearInterval(countdownRef.current);
              countdownRef.current = null;
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(result.error || tf("sendCodeFailed", "Failed to send code"));
      }
    } catch (err: any) {
      setError(err.message || tf("networkErrorMsg", "Network error"));
    } finally {
      sendingRef.current = false;
      setCodeSending(false);
    }
  };

  // ── 人机验证回调（数学验证码） ──
  const handleCaptchaVerify = async (captchaToken: string) => {
    try {
      const pending = pendingLoginRef.current;
      if (!pending) { setCaptchaOpen(false); return; }
      let result: { success: boolean; error?: string; termsAccepted?: boolean; needsUsernameSetup?: boolean };
      if (pending.type === "password") {
        result = await login(pending.args.usernameOrEmail, pending.args.password, captchaToken);
      } else {
        result = await loginWithCode(pending.args.codeEmail, pending.args.code, captchaToken);
      }
      if (result.success) { window.location.replace("/"); }
      else { setCaptchaOpen(false); setError(result.error || tf("loginFailed", "Login failed")); }
    } catch (err: any) { setCaptchaOpen(false); setError(err.message || tf("networkErrorMsg", "Network error")); }
    finally { pendingLoginRef.current = null; }
  };

  // ── Switch modes ──
  const switchToCodeMode = () => {
    setUseCode(true);
    setError("");
    setCodeEmail(usernameOrEmail);
    setCode("");
  };
  const switchToPasswordMode = () => {
    setUseCode(false);
    setError("");
    setCode("");
  };

  return (
    <motion.div
      className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.05 }}
    >
      <div className="absolute top-4 right-4 z-20">
        <AuthSettingsBar />
      </div>

      <div className="w-full max-w-md p-5 sm:p-8 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] mx-3 sm:mx-auto">
        <div className="mb-6 p-3 rounded-xl bg-gradient-to-r from-blue-50/80 to-cyan-50/80 dark:from-blue-950/30 dark:to-cyan-950/30 border border-blue-200/50 dark:border-blue-800/30 text-xs leading-relaxed text-[var(--color-text)]">
          {tf("siteIntro", "")}
          <span className="mt-2 block font-semibold text-blue-600 dark:text-blue-400 text-[11px]">{tf("freePlatform", "")}</span>
        </div>

        <div className="text-center mb-8">
          <img src="/neuroaccess-logo.png" alt="NeuroAccess" width={48} height={48} className="w-12 h-12 rounded-xl mx-auto mb-3 object-cover" />
          <h1 className="text-2xl font-bold text-[var(--color-text)]">NeuroAccess</h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{tf("login", "Log in")}</p>
        </div>

        {!useCode ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--color-text)]">
                {tf("username", "Username")} / {tf("email", "Email")}
              </label>
              <input type="text" value={usernameOrEmail} onChange={(e) => setUsernameOrEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border transition-colors bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)]/30"
                placeholder={tf("username", "Username")} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--color-text)]">{tf("password", "Password")}</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border transition-colors bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)]/30"
                  placeholder={tf("password", "Password")} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors" tabIndex={0}
                  aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/><path d="m3 3 18 18"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              <button type="button" onClick={switchToCodeMode} className="mt-1.5 text-xs text-[var(--color-primary)] hover:opacity-80 transition-opacity">
                {tf("forgotPassword", "Forgot password?")}
              </button>
            </div>

            {error && (
              <div role="alert" aria-live="assertive" className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <button type="submit" disabled={submitting}
              className="w-full py-2.5 px-4 rounded-2xl bg-[var(--color-primary)] text-[var(--color-bg)] font-semibold text-sm hover:opacity-90 disabled:opacity-40 transition-opacity">
              {submitting ? "..." : tf("loginButton", "Login")}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--color-text)]">{tf("email", "Email")}</label>
              <input type="email" value={codeEmail} onChange={(e) => setCodeEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border transition-colors bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)]/30"
                placeholder={tf("email", "Email")} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--color-text)]">{tf("verificationCode", "Verification Code")}</label>
              <div className="flex gap-2">
                <input type="text" value={code} onChange={(e) => setCode(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border transition-colors bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)]/30"
                  placeholder={tf("verificationCode", "Verification Code")} required />
                <button type="button" onClick={handleSendCode} disabled={codeCountdown > 0 || codeSending}
                  className="shrink-0 px-3 py-2.5 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-medium hover:bg-[var(--color-primary)]/20 disabled:opacity-40 transition-colors whitespace-nowrap">
                  {codeCountdown > 0 ? `${codeCountdown}s` : tf("getCode", "Get Code")}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" aria-live="assertive" className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <button type="submit" disabled={submitting}
              className="w-full py-2.5 px-4 rounded-2xl bg-[var(--color-primary)] text-[var(--color-bg)] font-semibold text-sm hover:opacity-90 disabled:opacity-40 transition-opacity">
              {submitting ? "..." : tf("loginButton", "Login")}
            </button>

            <button type="button" onClick={switchToPasswordMode}
              className="w-full text-center text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors">
              {tf("backToPasswordLogin", "Back to password login")}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-[var(--color-text-secondary)]">
          {tf("noAccount", "No account?")}{" "}
          <Link href="/register" className="font-medium underline underline-offset-2 hover:opacity-70 transition-opacity">
            {tf("register", "Register")}
          </Link>
        </div>
        <p className="mt-3 text-center text-xs text-[var(--color-text-secondary)]">
          {tf("loginHint", "You will be redirected after login.")}
        </p>
        </div>
        <CaptchaModal open={captchaOpen} onVerify={handleCaptchaVerify} onClose={() => { setCaptchaOpen(false); pendingLoginRef.current = null; }} />
      </motion.div>
  );
}
