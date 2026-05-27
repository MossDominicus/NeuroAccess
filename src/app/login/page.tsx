"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/language-context";
import { useTheme } from "@/lib/theme-context";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const { login, loading } = useAuth();
  const { t } = useLang();
  const { theme } = useTheme();

  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const result = await login(usernameOrEmail, password);
    setSubmitting(false);
    if (result.success) {
      router.push("/");
    } else {
      setError(result.error || "Login failed");
    }
  };

  const isDark = theme === "dark";

  return (
    <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-[#0a0a0f]" : "bg-[#f8f9fb]"}`}>
      <div className={`w-full max-w-md p-8 rounded-2xl ${isDark ? "bg-[#12121a] border border-[#1e1e2e]" : "bg-white border border-gray-100"}`}>
        <div className="text-center mb-8">
          <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
            NeuroAccess
          </h1>
          <p className={`mt-2 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            {t("login") || "Login"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              {t("username") || "Username"} / {t("email") || "Email"}
            </label>
            <input
              type="text"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-xl border transition-colors ${isDark ? "bg-[#1a1a2e] border-[#2a2a4a] text-white placeholder-gray-500" : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"} focus:outline-none focus:border-gray-400`}
              placeholder={t("username") || "Username"}
              required
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              {t("password") || "Password"}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-xl border transition-colors ${isDark ? "bg-[#1a1a2e] border-[#2a2a4a] text-white placeholder-gray-500" : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"} focus:outline-none focus:border-gray-400`}
              placeholder={t("password") || "Password"}
              required
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={`w-full py-2.5 px-4 rounded-2xl font-semibold text-sm transition-colors disabled:opacity-40 ${isDark ? "bg-white text-gray-900 hover:bg-gray-100" : "bg-gray-900 text-white hover:bg-gray-800"}`}
          >
            {submitting ? "..." : (t("loginButton") || "Login")}
          </button>
        </form>

        <div className={`mt-6 text-center text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          {t("noAccount") || "Don't have an account?"}{" "}
          <Link href="/register" className="font-medium underline underline-offset-2 hover:opacity-70 transition-opacity">
            {t("register") || "Register"}
          </Link>
        </div>
      </div>
    </div>
  );
}
