"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/language-context";
import { t } from "@/lib/translations";
import { getDisplayInitial } from "@/lib/display-initial";
import { ArrowLeft, User, Key, Mail, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";


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
  const [editAvatarUrl, setEditAvatarUrl] = useState(
    user?.avatar_color && AVATAR_COLORS.includes(user.avatar_color) ? user.avatar_color : AVATAR_COLORS[0]
  );
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  // 实时校验 username（保证保存按钮可正确禁用）
  const validateUsername = (v: string): { ok: boolean; error: string } => {
    if (!v || v === "") {
      return { ok: false, error: t(lang, "usernameRequired") || "请填写用户名" };
    }
    // 第一个字符必须是文字
    const firstChar = getDisplayInitial(v);
    const isLetterStart = /^\p{L}/u.test(firstChar);
    if (!isLetterStart) {
      return { ok: false, error: t(lang, "usernameMustStartWithLetter") || "名字开头必须是文字" };
    }
    // 禁止特殊符号（允许字母/数字/空格/中日韩/emoji/下划线/连字符）
    if (/[!@#$%^&*()+\=\[\]{}|\\;:'"`/<>?~.,。]/.test(v)) {
      return { ok: false, error: t(lang, "usernameNoSpecialChars") || "名字不能包含特殊符号" };
    }
    // 禁止连续空格
    if (/\s{2,}/.test(v)) {
      return { ok: false, error: t(lang, "noConsecutiveSpaces") || "名字中不能有连续空格" };
    }
    // 视觉长度 1-20
    const vlen = Array.from(v).filter(ch => !/[\u0300-\u036f\u0483-\u0489]/.test(ch)).length;
    if (vlen < 1) {
      return { ok: false, error: t(lang, "usernameRequired") || "请填写用户名" };
    }
    if (vlen > 20) {
      return { ok: false, error: t(lang, "usernameTooLong") || "名字最多 20 个字符" };
    }
    return { ok: true, error: "" };
  };

  const usernameValidation = validateUsername(editUsername);

  useEffect(() => {
    if (user) {
      setEditUsername(user.username || "");
      setEditAvatarUrl(user?.avatar_color || "blue");
    }
  }, [user]);

  const submitProfileUpdate = async () => {
    setEditError("");
    setEditSuccess("");
    // 客户端再次校验：未通过则直接拒绝提交
    const v = validateUsername(editUsername);
    if (!v.ok) {
      setEditError(v.error);
      return;
    }
    setEditLoading(true);
    try {
      const result = await updateProfile({ username: editUsername, avatar_color: editAvatarUrl });
      if (result.success) {
        setEditSuccess(t(lang, "profileUpdated") || "资料更新成功");
        // 更新本地用户状态
        if (user) {
          const updated = { ...user, username: editUsername, avatar_color: editAvatarUrl };
          updateUser(updated);
        }
      } else {
        setEditError(result.error || t(lang, "failedToUpdateProfile") || "更新失败");
      }
    } catch (e: any) {
      setEditError(e.message || t(lang, "failedToUpdateProfile") || "更新失败");
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
        setPwError(result.error || t(lang, "sendCodeFailed") || "验证码发送失败");
      }
    } catch (e: any) {
      setPwError(e.message || t(lang, "networkError") || "网络错误");
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
        setPwError(result.error || t(lang, "failedToChangePasswordMsg") || "修改失败");
      }
    } catch (e: any) {
      setPwError(e.message || t(lang, "failedToChangePasswordMsg") || "修改失败");
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
      let result: any;
      try {
        result = await resp.json();
      } catch {
        result = { detail: t(lang, "sendCodeFailed") || "验证码发送失败" };
      }
      if (resp.ok && result.success) {
        setEmailSuccess(t(lang, "codeSentToEmail") || "验证码已发送到新邮箱");
        setEmailCountdown(60);
      } else {
        setEmailError(result.detail || result.error || t(lang, "sendCodeFailed") || "验证码发送失败");
      }
    } catch (e: any) {
      setEmailError(e.message || t(lang, "networkError") || "网络错误");
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
        setEmailError(result.error || t(lang, "failedToChangeEmail") || "邮箱修改失败");
      }
    } catch (e: any) {
      setEmailError(e.message || t(lang, "failedToChangeEmail") || "邮箱修改失败");
    }
    setEmailLoading(false);
  };

  // ---------- 注销账号 ----------
  const [deleteCode, setDeleteCode] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState("");

  const sendDeleteCode = async () => {
    setDeleteError("");
    setDeleteLoading(true);
    try {
      const result = await sendDeleteAccountCode();
      if (result.success) {
        setDeleteSuccess(t(lang, "codeSentToEmail") || "验证码已发送到邮箱");
      } else {
        setDeleteError(result.error || t(lang, "sendCodeFailed") || "验证码发送失败");
      }
    } catch (e: any) {
      setDeleteError(e.message || t(lang, "networkError") || "网络错误");
    }
    setDeleteLoading(false);
  };

  const submitDeleteAccount = async () => {
    setDeleteError("");
    setDeleteSuccess("");
    if (!deleteCode) {
      setDeleteError(t(lang, "verificationCodeRequired") || "请输入验证码");
      return;
    }
    const confirmMsg = t(lang, "deleteAccountConfirm") || "确认注销账号？此操作不可撤销！";
    if (!window.confirm(confirmMsg)) {
      return;
    }
    setDeleteLoading(true);
    try {
      const result = await deleteAccount({ verification_code: deleteCode });
      if (result.success) {
        setDeleteSuccess(t(lang, "accountDeleted") || "账号已注销");
        setTimeout(() => { logout(); router.push("/"); }, 1500);
      } else {
        setDeleteError(result.error || t(lang, "failedToDeleteAccount") || "注销失败");
      }
    } catch (e: any) {
      setDeleteError(e.message || t(lang, "failedToDeleteAccount") || "注销失败");
    }
    setDeleteLoading(false);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <div className="text-[var(--color-text-secondary)]">{t(lang, "loading") || "加载中..."}</div>
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-[var(--color-bg)] overflow-y-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.05 }}
    >
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

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6 pb-[env(safe-area-inset-bottom,16px)]">
        {/* 1. 编辑资料 */}
        <section className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-border)]">
            <h3 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2">
              <User className="w-4 h-4" />
              {t(lang, "editProfile") || "编辑资料"}
            </h3>
          </div>
          <div className="p-5 space-y-4">
            {/* 大号头像预览 */}
            <div className="flex justify-center mb-2">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold border-4 border-[var(--color-border)]"
                style={{ backgroundColor: editAvatarUrl || "#3B82F6" }}
              >
                {getDisplayInitial(editUsername || user?.username || "?")}
              </div>
            </div>
            {/* 头像颜色选择 */}
            <div>
              <label className="block text-xs text-[var(--color-text-secondary)] mb-2">
                {t(lang, "avatarColor") || "头像颜色"}
              </label>
              <div className="flex flex-row gap-4 flex-wrap justify-center">
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setEditAvatarUrl(color)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold transition-all shrink-0 ${
                      editAvatarUrl === color ? "ring-2 ring-offset-2 ring-[var(--color-primary)] scale-125" : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: color }}
                  >
                    {getDisplayInitial(user.username || "?")}
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
                onChange={(e) => {
                  const v = e.target.value;
                  // 实时同步到 state 并显示错误（不阻塞输入）
                  setEditUsername(v);
                  const result = validateUsername(v);
                  if (!result.ok) {
                    setEditError(result.error);
                  } else {
                    setEditError("");
                  }
                }}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-sm text-[var(--color-text)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            {/* 保存按钮 */}
            <button
              onClick={submitProfileUpdate}
              disabled={editLoading || !usernameValidation.ok}
              className="w-full rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-bg)] transition-colors hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {editLoading ? (
                <span className="inline-block animate-spin">⏳</span>
              ) : (
                <>{t(lang, "save") || "保存"}</>
              )}
            </button>
            {editError && <p className="text-xs text-red-500 dark:text-red-400">{editError}</p>}
            {editSuccess && <p className="text-xs text-emerald-500 dark:text-emerald-400">{editSuccess}</p>}
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
              className="w-full rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-bg)] transition-colors hover:opacity-90 disabled:opacity-40"
            >
              {pwLoading ? <span className="inline-block animate-spin">⏳</span> : (t(lang, "changePassword") || "修改密码")}
            </button>
            {pwError && <p className="text-xs text-red-500 dark:text-red-400">{pwError}</p>}
            {pwSuccess && <p className="text-xs text-emerald-500 dark:text-emerald-400">{pwSuccess}</p>}
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
                  placeholder={t(lang, "emailPlaceholder") || "name@example.com"}
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
              className="w-full rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-bg)] transition-colors hover:opacity-90 disabled:opacity-40"
            >
              {emailLoading ? <span className="inline-block animate-spin">⏳</span> : (t(lang, "confirmChange") || "确认修改")}
            </button>
            {emailError && <p className="text-xs text-red-500 dark:text-red-400">{emailError}</p>}
            {emailSuccess && <p className="text-xs text-emerald-500 dark:text-emerald-400">{emailSuccess}</p>}
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
              disabled={deleteLoading}
              className="w-full rounded-xl border border-red-300 dark:border-red-700 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-40"
            >
              {t(lang, "sendCodeToCurrentEmail") || "发送验证码到当前邮箱"}
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
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-sm text-[var(--color-text)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400"
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
            {deleteError && <p className="text-xs text-red-500 dark:text-red-400">{deleteError}</p>}
            {deleteSuccess && <p className="text-xs text-emerald-500 dark:text-emerald-400">{deleteSuccess}</p>}
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
    </motion.div>
  );
}
