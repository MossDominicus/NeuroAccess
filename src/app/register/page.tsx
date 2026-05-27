"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/language-context";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const { register, loading } = useAuth();
  const { t } = useLang();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("passwordMismatch") || "Passwords do not match");
      return;
    }

    setSubmitting(true);
    const result = await register(username, email, password);
    setSubmitting(false);

    if (result.success) {
      router.push("/");
    } else {
      setError(result.error || "Registration failed");
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
            {t("register") || "Register"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-300">
              {t("username") || "Username"}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border transition-colors bg-[#1a1a2e] border-[#2a2a4a] text-white placeholder-gray-500 focus:outline-none focus:border-gray-400"
              placeholder={t("username") || "Username"}
              required
              minLength={3}
              maxLength={30}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-300">
              {t("email") || "Email"}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border transition-colors bg-[#1a1a2e] border-[#2a2a4a] text-white placeholder-gray-500 focus:outline-none focus:border-gray-400"
              placeholder={t("email") || "Email"}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-300">
              {t("password") || "Password"}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border transition-colors bg-[#1a1a2e] border-[#2a2a4a] text-white placeholder-gray-500 focus:outline-none focus:border-gray-400"
              placeholder={t("password") || "Password"}
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-300">
              {t("confirmPassword") || "Confirm Password"}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border transition-colors bg-[#1a1a2e] border-[#2a2a4a] text-white placeholder-gray-500 focus:outline-none focus:border-gray-400"
              placeholder={t("confirmPassword") || "Confirm Password"}
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
            className="w-full py-2.5 px-4 rounded-2xl bg-white text-gray-900 font-semibold text-sm hover:bg-gray-100 disabled:opacity-40 transition-colors"
          >
            {submitting ? "..." : (t("registerButton") || "Register")}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-400">
          {t("hasAccount") || "Already have an account?"}{" "}
          <Link href="/login" className="font-medium underline underline-offset-2 hover:opacity-70 transition-opacity">
            {t("login") || "Login"}
          </Link>
        </div>
      </div>
    </div>
  );
}
