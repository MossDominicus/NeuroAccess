"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/language-context";
import { t } from "@/lib/translations";
import { ArrowLeft, User, Key, Mail, AlertTriangle, Eye, EyeOff } from "lucide-react";

const AVATAR_COLORS = [
  "#EF4444", "#F97316", "#EAB308", "#22C55E",
  "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6",
];

export default function AccountPage() {
  const { user, token, logout, updateUser, updateProfile, changePassword, sendVerificationCode, updateEmail, sendDeleteAccountCode, deleteAccount, loading } = useAuth();
  const { lang } = useLang();
  const router = useRouter();

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

  // Redirect if not logged in (but wait for loading to finish)
  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  // ---------- 编辑资料 ----------
  const [editUsername, setEditUsername] = useState(user?.username || "");
  const [editAvatarUrl, setEditAvatarUrl] = useState(user?.avatar_url || "");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  useEffect(() => {
    if (user) {
      setEditUsername(user.username || "");
      setEditAvatarUrl(user.avatar_url || "");
    }
  }, [user]);

  const submitProfileUpdate = async () => {
    setEditError("");
    setEditSuccess("");
    setEditLoading(true);
    try {
      const result = await updateProfile({ username: editUsername, avatar_url: editAvatarUrl });
      if (result.success) {
        setEditSuccess(t(lang, "profileUpdated") || "资料更新成功");
        // 更新本地用户状态
        if (user) {
          const updated = { ...user, username: editUsername, avatar_url: editAvatarUrl };
          updateUser(updated);
        }
      } else {
        setEditError(result.error || "更新失败");
      }
    } catch (e: any) {
      setEditError(e.message || "更新失败");
    }
    setEditLoading(false);
  };

  // ---------- 修改密码 ----------
  const [pwCode, setPwCode] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwShowNew, setPwShowNew] = useState(false);
  const [pwShowConfirm, setPwShowConfirm] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwCountdown, setPwCountdown] = useState(0);

  useEffect(() => {
    if (pwCountdown <= 0) return;
    const t = setTimeout(() => setPwCountdown(pwCountdown - 1), 1000);
    return () => clearTimeout(t);
  }, [pwCountdown]);

  const sendPwCode = async () => {
    setPwError("");
    setPwLoading(true);
    try {
      const result = await sendVerificationCode({});
      if (result.success) {
        setPwSuccess(t(lang, "codeSentToEmail") || "验证码已发送到邮箱");
        setPwCountdown(60);
      } else {
        setPwError(result.error || "发送失败");
      }
    } catch (e: any) {
      setPwError(e.message || "发送失败");
    }
    setPwLoading(false);
  };

  const submitPwChange = async () => {
    setPwError("");
    setPwSuccess("");
    if (pwNew !== pwConfirm) {
      setPwError(t(lang, "passwordMismatch") || "两次密码不一致");
      return;
    }
    if (pwNew.length < 6) {
      setPwError(t(lang, "passwordTooShort") || "密码至少6位");
      return;
    }
    if (!pwCode) {
      setPwError(t(lang, "verificationCodeRequired") || "请输入验证码");
      return;
    }
    setPwLoading(true);
    try {
      const result = await changePassword({ verification_code: pwCode, new_password: pwNew });
      if (result.success) {
        setPwSuccess(t(lang, "passwordChanged") || "密码已修改");
        setPwCode("");
        setPwNew("");
        setPwConfirm("");
      } else {
        setPwError(result.error || "修改失败");
      }
    } catch (e: any) {
      setPwError(e.message || "修改失败");
    }
    setPwLoading(false);
  };

  // ---------- 修改邮箱 ----------
  const [emailNew, setEmailNew] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");
  const [emailCountdown, setEmailCountdown] = useState(0);

  useEffect(() => {
    if (emailCountdown <= 0) return;
    const t = setTimeout(() => setEmailCountdown(emailCountdown - 1), 1000);
    return () => clearTimeout(t);
  }, [emailCountdown]);

  const sendEmailCode = async () => {
    setEmailError("");
    if (!emailNew || !emailNew.includes("@")) {
      setEmailError(t(lang, "validEmailRequired") || "请输入有效邮箱");
      return;
    }
    setEmailLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/auth/send-email-change-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${token}`,
        },
        body: new URLSearchParams({ new_email: emailNew }),
      });
      const result = await resp.json();
      if (result.success) {
        setEmailSuccess(t(lang, "codeSentToEmail") || "验证码已发送到新邮箱");
        setEmailCountdown(60);
      } else {
        setEmailError(result.error || "发送失败");
      }
    } catch (e: any) {
      setEmailError(e.message || "发送失败");
    }
    setEmailLoading(false);
  };

  const submitEmailChange = async () => {
    setEmailError("");
    setEmailSuccess("");
    if (!emailCode) {
      setEmailError(t(lang, "verificationCodeRequired") || "请输入验证码");
      return;
    }
    setEmailLoading(true);
    try {
      const result = await updateEmail({ new_email: emailNew, verification_code: emailCode });
      if (result.success) {
        setEmailSuccess(t(lang, "emailUpdated") || "邮箱已更新");
        setEmailNew("");
        setEmailCode("");
      } else {
        setEmailError(result.error || "修改失败");
      }
    } catch (e: any) {
      setEmailError(e.message || "修改失败");
    }
    setEmailLoading(false);
  };

  // ---------- 注销账号 ----------
  const [deleteCode, setDeleteCode] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState("");
  const [deleteCountdown, setDeleteCountdown] = useState(0);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  useEffect(() => {
    if (deleteCountdown <= 0) return;
    const t = setTimeout(() => setDeleteCountdown(deleteCountdown - 1), 1000);
    return () => clearTimeout(t);
  }, [deleteCountdown]);

  const sendDeleteCode = async () => {
    setDeleteError("");
    setDeleteLoading(true);
    try {
      const result = await sendDeleteAccountCode();
      if (result.success) {
        setDeleteSuccess(t(lang, "codeSentToEmail") || "验证码已发送到邮箱");
        setDeleteCountdown(60);
      } else {
        setDeleteError(result.error || "发送失败");
      }
    } catch (e: any) {
      setDeleteError(e.message || "发送失败");
    }
    setDeleteLoading(false);
  };

  const submitDeleteAccount = async () => {
    setDeleteError("");
    setDeleteSuccess("");
    if (deleteConfirmText !== "DELETE") {
      setDeleteError(t(lang, "typeDeleteToConfirm") || "请输入 DELETE 确认");
      return;
    }
    if (!deleteCode) {
      setDeleteError(t(lang, "verificationCodeRequired") || "请输入验证码");
      return;
    }
    setDeleteLoading(true);
    try {
      const result = await deleteAccount({ verification_code: deleteCode });
      if (result.success) {
        setDeleteSuccess(t(lang, "accountDeleted") || "账号已注销");
        setTimeout(() => { logout(); router.push("/"); }, 1500);
      } else {
        setDeleteError(result.error || "注销失败");
      }
    } catch (e: any) {
      setDeleteError(e.message || "注销失败");
    }
    setDeleteLoading(false);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <div className="text-[var(--color-text-secondary)]">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Header */}
      <header className="h-14 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center px-4">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">{t(lang, "back") || "返回"}</span>
        </button>
        <span className="ml-4 text-sm font-semibold text-[var(--color-text)]">
          {t(lang, "accountSettings") || "账号设置"}
        </span>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* 1. 编辑资料 */}
        <section className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-border)]">
            <h3 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2">
              <User className="w-4 h-4" />
              {t(lang, "editProfile") || "编辑资料"}
            </h3>
          </div>
          <div className="p-5 space-y-4">
            {/* 头像颜色选择 */}
            <div>
              <label className="block text-xs text-[var(--color-text-secondary)] mb-2">
                {t(lang, "avatarColor") || "头像颜色"}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setEditAvatarUrl(color)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold transition-all ${
                      editAvatarUrl === color ? "ring-2 ring-offset-2 ring-[var(--color-primary)] scale-110" : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: color }}
                  >
                    {(user.username || "?")[0].toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            {/* 用户名 */}
            <div>
              <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                {t(lang, "username") || "用户名"}
              </label>
              <input
                type="text"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-sm text-[var(--color-text)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            {/* 保存按钮 */}
            <button
              onClick={submitProfileUpdate}
              disabled={editLoading}
              className="w-full rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-40"
            >
              {editLoading ? (
                <span className="inline-block animate-spin">⏳</span>
              ) : (
                <>{t(lang, "save") || "保存"}</>
              )}
            </button>
            {editError && <p className="text-xs text-red-500">{editError}</p>}
            {editSuccess && <p className="text-xs text-emerald-500">{editSuccess}</p>}
          </div>
        </section>

        {/* 2. 修改密码 */}
        <section className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-border)]">
            <h3 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2">
              <Key className="w-4 h-4" />
              {t(lang, "changePassword") || "修改密码"}
            </h3>
          </div>
          <div className="p-5 space-y-4">
            {/* 验证码 */}
            <div>
              <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                {t(lang, "verificationCode") || "验证码"}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={pwCode}
                  onChange={(e) => setPwCode(e.target.value)}
                  placeholder={t(lang, "enterCode") || "请输入验证码"}
                  className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-sm text-[var(--color-text)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                <button
                  onClick={sendPwCode}
                  disabled={pwLoading || pwCountdown > 0}
                  className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] transition-colors disabled:opacity-40 whitespace-nowrap"
                >
                  {pwCountdown > 0 ? `${pwCountdown}s` : (t(lang, "sendCode") || "发送验证码")}
                </button>
              </div>
            </div>
            {/* 新密码 */}
            <div>
              <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                {t(lang, "newPassword") || "新密码"}
              </label>
              <div className="relative">
                <input
                  type={pwShowNew ? "text" : "password"}
                  value={pwNew}
                  onChange={(e) => setPwNew(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 pr-10 text-sm text-[var(--color-text)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                <button
                  type="button"
                  onClick={() => setPwShowNew(!pwShowNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
                >
                  {pwShowNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {/* 确认密码 */}
            <div>
              <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                {t(lang, "confirmPassword") || "确认密码"}
              </label>
              <div className="relative">
                <input
                  type={pwShowConfirm ? "text" : "password"}
                  value={pwConfirm}
                  onChange={(e) => setPwConfirm(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 pr-10 text-sm text-[var(--color-text)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                <button
                  type="button"
                  onClick={() => setPwShowConfirm(!pwShowConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
                >
                  {pwShowConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {/* 修改按钮 */}
            <button
              onClick={submitPwChange}
              disabled={pwLoading}
              className="w-full rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-40"
            >
              {pwLoading ? <span className="inline-block animate-spin">⏳</span> : (t(lang, "changePassword") || "修改密码")}
            </button>
            {pwError && <p className="text-xs text-red-500">{pwError}</p>}
            {pwSuccess && <p className="text-xs text-emerald-500">{pwSuccess}</p>}
          </div>
        </section>

        {/* 3. 修改邮箱 */}
        <section className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-border)]">
            <h3 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {t(lang, "changeEmail") || "修改邮箱"}
            </h3>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-xs text-[var(--color-text-secondary)]">
              {t(lang, "currentEmail") || "当前邮箱"}: <span className="text-[var(--color-text)]">{user.email}</span>
            </p>
            {/* 新邮箱 */}
            <div>
              <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                {t(lang, "newEmail") || "新邮箱"}
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={emailNew}
                  onChange={(e) => setEmailNew(e.target.value)}
                  placeholder="name@example.com"
                  className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-sm text-[var(--color-text)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                <button
                  onClick={sendEmailCode}
                  disabled={emailLoading || emailCountdown > 0}
                  className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] transition-colors disabled:opacity-40 whitespace-nowrap"
                >
                  {emailCountdown > 0 ? `${emailCountdown}s` : (t(lang, "sendCode") || "发送验证码")}
                </button>
              </div>
            </div>
            {/* 验证码 */}
            <div>
              <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                {t(lang, "verificationCode") || "验证码"}
              </label>
              <input
                type="text"
                value={emailCode}
                onChange={(e) => setEmailCode(e.target.value)}
                placeholder={t(lang, "enterCode") || "请输入验证码"}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-sm text-[var(--color-text)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            {/* 提交按钮 */}
            <button
              onClick={submitEmailChange}
              disabled={emailLoading}
              className="w-full rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-40"
            >
              {emailLoading ? <span className="inline-block animate-spin">⏳</span> : (t(lang, "confirmChange") || "确认修改")}
            </button>
            {emailError && <p className="text-xs text-red-500">{emailError}</p>}
            {emailSuccess && <p className="text-xs text-emerald-500">{emailSuccess}</p>}
          </div>
        </section>

        {/* 4. 注销账号 */}
        <section className="rounded-2xl bg-[var(--color-surface)] border-2 border-red-300 dark:border-red-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-red-300 dark:border-red-700">
            <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {t(lang, "deleteAccount") || "注销账号"}
            </h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="rounded-xl bg-red-50 dark:bg-red-950/30 p-4">
              <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">
                {t(lang, "deleteAccountWarning") || "注销账号后，所有数据将无法恢复。此操作不可撤销，请谨慎操作。"}
              </p>
            </div>
            {/* 发送验证码 */}
            <button
              onClick={sendDeleteCode}
              disabled={deleteLoading || deleteCountdown > 0}
              className="w-full rounded-xl border border-red-300 dark:border-red-700 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-40"
            >
              {deleteCountdown > 0 ? `${deleteCountdown}s` : (t(lang, "sendCodeToCurrentEmail") || "发送验证码到当前邮箱")}
            </button>
            {/* 验证码 */}
            <div>
              <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                {t(lang, "verificationCode") || "验证码"}
              </label>
              <input
                type="text"
                value={deleteCode}
                onChange={(e) => setDeleteCode(e.target.value)}
                placeholder={t(lang, "enterCode") || "请输入验证码"}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-sm text-[var(--color-text)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            {/* 确认文字 */}
            <div>
              <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                {t(lang, "typeDeleteToConfirm") || "输入 DELETE 确认注销"}
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full rounded-xl border border-red-300 dark:border-red-700 bg-[var(--color-bg)] px-4 py-2 text-sm text-red-600 placeholder-red-300 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            {/* 注销按钮 */}
            <button
              onClick={submitDeleteAccount}
              disabled={deleteLoading}
              className="w-full rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-40"
            >
              {deleteLoading ? <span className="inline-block animate-spin">⏳</span> : (t(lang, "confirmDeleteAccount") || "确认注销账号")}
            </button>
            {deleteError && <p className="text-xs text-red-500">{deleteError}</p>}
            {deleteSuccess && <p className="text-xs text-emerald-500">{deleteSuccess}</p>}
          </div>
        </section>

        {/* 退出登录 */}
        <div className="pt-4">
          <button
            onClick={() => { logout(); router.push("/"); }}
            className="w-full rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] transition-colors"
          >
            {t(lang, "logout") || "退出登录"}
          </button>
        </div>
      </div>
    </div>
  );
}
