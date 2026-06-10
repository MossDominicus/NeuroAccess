"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { translations } from "@/lib/translations";

interface LoginFormProps {
  lang: string;
}

export default function LoginForm({ lang }: LoginFormProps) {
  const router = useRouter();
  const { login } = useAuth();

  // Helper: get translation directly from translations object (no useLang needed)
  const tf = (key: string, fallback: string) => {
    const val = translations[lang as keyof typeof translations]?.[key];
    return val || fallback;
  };

  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const result = await login(usernameOrEmail, password);
      if (result.success) {
        // 强制整页刷新，确保 middleware 读取到新 cookie
        window.location.href = "/";
      } else {
        setError(result.error || tf("loginFailed", "登录失败"));
      }
    } catch (err: any) {
      setError(err.message || tf("networkErrorMsg", "网络错误"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      <div className="w-full max-w-md p-8 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
        <div className="text-center mb-8">
          <img src="/neuroaccess-logo.png" alt="NeuroAccess" className="w-12 h-12 rounded-xl mx-auto mb-3 object-cover" />
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            NeuroAccess
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            {tf("login", "登录")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[var(--color-text)]">
              {tf("username", "用户名")} / {tf("email", "邮箱")}
            </label>
            <input
              type="text"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border transition-colors bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)]/30"
              placeholder={tf("username", "用户名")}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-[var(--color-text)]">
              {tf("password", "密码")}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl border transition-colors bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)]/30"
                placeholder={tf("password", "密码")}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/><path d="m3 3 18 18"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-2xl bg-[var(--color-primary)] text-[var(--color-bg)] font-semibold text-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {submitting ? "..." : tf("loginButton", "登录")}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-[var(--color-text-secondary)]">
          {tf("noAccount", "没有账号？")}{" "}
          <Link href="/register" className="font-medium underline underline-offset-2 hover:opacity-70 transition-opacity">
            {tf("register", "注册")}
          </Link>
        </div>
        <p className="mt-3 text-center text-xs text-[var(--color-text-secondary)]">
          {tf("loginHint", "登录后将自动跳转。")}
        </p>
      </div>
    </motion.div>
  );
}
