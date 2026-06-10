"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { translations } from "@/lib/translations";

interface RegisterFormProps {
  lang: string;
}

export default function RegisterForm({ lang }: RegisterFormProps) {
  const router = useRouter();
  const { register } = useAuth();

  // Helper: get translation directly from translations object (no useLang needed)
  const tf = (key: string, fallback: string) => {
    const val = translations[lang as keyof typeof translations]?.[key];
    return val || fallback;
  };

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleSendCode = async () => {
    if (!email || countdown > 0) return;
    setError("");
    try {
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/auth/register-verification-code`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ email }),
      });
      let data: any;
      try {
        data = await resp.json();
      } catch {
        data = { detail: tf("sendCodeFailed", "验证码发送失败") };
      }
      if (resp.ok && data.success) {
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) { clearInterval(timer); return 0; }
            return prev - 1;
          });
        }, 1000);
        if (data.dev_code) {
          alert(`开发模式：验证码是 ${data.dev_code}`);
        }
      } else {
        setError(data.detail || data.error || tf("sendCodeFailed", "验证码发送失败"));
      }
    } catch (err: any) {
      setError(err.message || tf("networkErrorMsg", "网络错误"));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(tf("passwordMismatch", "密码不一致"));
      return;
    }

    setSubmitting(true);

    try {
      const result = await register(username, email, password, code);
      if (result.success) {
        window.location.href = "/";
      } else {
        setError(result.error || tf("registerFailed", "注册失败"));
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
          <img src="/neuroaccess-logo.png" alt="NeuroAccess" width={48} height={48} className="w-12 h-12 rounded-xl mx-auto mb-3 object-cover" />
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            NeuroAccess
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            {tf("register", "注册")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[var(--color-text)]">
              {tf("username", "用户名")}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") {
                  setUsername(v);
                  setError(tf("usernameRequired", "请填写用户名"));
                  return;
                }
                // 第一个字符必须是文字
                const firstChar = Array.from(v)[0] || "";
                const isLetterStart = /^\p{L}/u.test(firstChar);
                if (!isLetterStart) {
                  setError(tf("usernameMustStartWithLetter", "名字开头必须是文字"));
                  return;
                }
                // 禁止特殊符号（允许字母/数字/空格/中日韩/emoji/下划线/连字符）
                if (/[!@#$%^&*()+\=\[\]{}|\\;:'"`/<>?~.,。]/.test(v)) {
                  setError(tf("usernameNoSpecialChars", "名字不能包含特殊符号"));
                  return;
                }
                if (/\s{2,}/.test(v)) {
                  setError(tf("noConsecutiveSpaces", "名字中不能有连续空格"));
                  return;
                }
                const vlen = Array.from(v).filter(ch => !/[\u0300-\u036f\u0483-\u0489]/.test(ch)).length;
                if (vlen >= 1 && vlen <= 20) {
                  setError("");
                } else if (vlen > 20) {
                  setError(tf("usernameTooLong", "名字最多 20 个字符"));
                }
                setUsername(v);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border transition-colors bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)]/30"
              placeholder={tf("username", "用户名")}
              required
              minLength={1}
              maxLength={20}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-[var(--color-text)]">
              {tf("email", "邮箱")}
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl border transition-colors bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)]/30"
                placeholder={tf("email", "邮箱")}
                required
              />
              <button
                type="button"
                onClick={handleSendCode}
                disabled={!email || countdown > 0}
                className="px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-[var(--color-bg)] text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity whitespace-nowrap"
              >
                {countdown > 0 ? `${countdown}s` : tf("sendCode", "获取验证码")}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-[var(--color-text)]">
              {tf("verificationCode", "验证码")}
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border transition-colors bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)]/30"
              placeholder={tf("verificationCode", "验证码")}
              required
              maxLength={6}
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
                minLength={6}
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

          <div>
            <label className="block text-sm font-medium mb-1.5 text-[var(--color-text)]">
              {tf("confirmPassword", "确认密码")}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl border transition-colors bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)]/30"
                placeholder={tf("confirmPassword", "确认密码")}
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
            {submitting ? "..." : tf("registerButton", "注册")}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-[var(--color-text-secondary)]">
          {tf("hasAccount", "已有账号？")}{" "}
          <Link href="/login" className="font-medium underline underline-offset-2 hover:opacity-70 transition-opacity">
            {tf("login", "登录")}
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
