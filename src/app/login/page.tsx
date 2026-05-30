"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLang();
  const { login } = useAuth();

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
        router.push("/");
      } else {
        setError(result.error || "Login failed");
      }
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
      <div className="w-full max-w-md p-8 rounded-2xl bg-[#12121a] border border-[#1e1e2e]">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">
            NeuroAccess
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            {t("login") || "Login"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-300">
              {t("username") || "Username"} / {t("email") || "Email"}
            </label>
            <input
              type="text"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border transition-colors bg-[#1a1a2e] border-[#2a2a4a] text-white placeholder-gray-500 focus:outline-none focus:border-gray-400"
              placeholder={t("username") || "Username"}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-300">
              {t("password") || "Password"}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl border transition-colors bg-[#1a1a2e] border-[#2a2a4a] text-white placeholder-gray-500 focus:outline-none focus:border-gray-400"
                placeholder={t("password") || "Password"}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
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
            className="w-full py-2.5 px-4 rounded-2xl bg-white text-gray-900 font-semibold text-sm hover:bg-gray-100 disabled:opacity-40 transition-colors"
          >
            {submitting ? "..." : (t("loginButton") || "Login")}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-400">
          {t("noAccount") || "Don't have an account?"}{" "}
          <Link href="/register" className="font-medium underline underline-offset-2 hover:opacity-70 transition-opacity">
            {t("register") || "Register"}
          </Link>
        </div>
        <p className="mt-3 text-center text-xs text-gray-500">
          {t("loginHint") || "After logging in, you will be redirected automatically."}
        </p>
      </div>
    </div>
  );
}
