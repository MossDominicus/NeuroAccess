"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLang } from "./language-context";

interface User {
  id: number;
  username: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  avatar_color?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (usernameOrEmail: string, password: string) => Promise<{ success: boolean; error?: string; termsAccepted?: boolean; needsUsernameSetup?: boolean }>;
  register: (username: string, email: string, password: string, code?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
  updateUser: (user: User) => void;
  updateProfile: (data: { username?: string; avatar_color?: string }) => Promise<{ success: boolean; error?: string }>;
  changePassword: (data: { verification_code: string; new_password: string }) => Promise<{ success: boolean; error?: string }>;
  sendVerificationCode: (data: { email?: string }) => Promise<{ success: boolean; error?: string }>;
  updateEmail: (data: { new_email: string; verification_code: string }) => Promise<{ success: boolean; error?: string }>;
  sendDeleteAccountCode: () => Promise<{ success: boolean; error?: string }>;
  deleteAccount: (data: { verification_code: string }) => Promise<{ success: boolean; error?: string }>;
  termsAccepted: boolean;
  needsUsernameSetup: boolean;
  acceptTerms: () => Promise<boolean>;
  setNeedsUsernameSetup: (v: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

// ── 同意条款版本 ──────────────────────────────────────────────
// 以后更新条款时改为 "v2"，所有用户会重新看到同意弹窗
const CONSENT_VERSION = "v1";
const CONSENT_STORAGE_KEY = "neuroaccess-consent-v1";

interface ConsentRecord {
  accepted: boolean;
  acceptedAt: string;
  version: string;
}

/** 从 localStorage 读取同���记录（兼容版本检查） */
function loadConsent(): boolean {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return false;
    const record: ConsentRecord = JSON.parse(raw);
    return record.accepted === true && record.version === CONSENT_VERSION;
  } catch {
    return false;
  }
}

/** 保存同意记录到 localStorage */
function saveConsent(): void {
  try {
    const record: ConsentRecord = {
      accepted: true,
      acceptedAt: new Date().toISOString(),
      version: CONSENT_VERSION,
    };
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // localStorage 不可用时忽略
  }
}

/** 清除同意记录 */
function clearConsent(): void {
  try {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsUsernameSetup, setNeedsUsernameSetup] = useState(false);

  // termsAccepted 从 localStorage consent 记录初始化，不依赖后端
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    // 加载 token、用户、同意记录
    try {
      const savedToken = localStorage.getItem("neuroaccess-token");
      const savedUser = localStorage.getItem("neuroaccess-user");
      if (savedToken && savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsedUser);
      }
      // 检查本地 consent 记录（页面刷新时不显示弹窗）
      if (loadConsent()) {
        setTermsAccepted(true);
      }
    } catch {}
    setLoading(false);
  }, []);

  const tf = (key: string, fb: string) => { const v = t(key); return v === key ? fb : v; };
  const { t } = useLang();

  const login = async (usernameOrEmail: string, password: string): Promise<{ success: boolean; error?: string; termsAccepted?: boolean; needsUsernameSetup?: boolean }> => {
    try {
      const resp = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username_or_email: usernameOrEmail, password }),
      });
      const data = await resp.json();
      if (data.success) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem("neuroaccess-token", data.token);
        localStorage.setItem("neuroaccess-user", JSON.stringify(data.user));
        document.cookie = `neuroaccess-token=${data.token}; path=/; max-age=2592000`;

        const nu = !!data.needs_username_setup;
        setNeedsUsernameSetup(nu);

        // 本地同意记录 > 后端记录（用户离线同意过就算数）
        if (loadConsent()) {
          setTermsAccepted(true);
        } else if (data.terms_accepted) {
          // 后端说已同意但本地无记录 → 同步到本地
          saveConsent();
          setTermsAccepted(true);
        } else {
          setTermsAccepted(false);
        }

        return { success: true, termsAccepted: !!data.terms_accepted, needsUsernameSetup: nu };
      }
      return { success: false, error: data.error || tf("loginFailed", "登录失败") };
    } catch (e: any) {
      return { success: false, error: e.message || tf("networkErrorMsg", "网络错误") };
    }
  };

  const register = async (username: string, email: string, password: string, code: string = ""): Promise<{ success: boolean; error?: string }> => {
    try {
      const resp = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username, email, password, code }),
      });
      const data = await resp.json();
      if (data.success) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem("neuroaccess-token", data.token);
        localStorage.setItem("neuroaccess-user", JSON.stringify(data.user));
        document.cookie = `neuroaccess-token=${data.token}; path=/; max-age=2592000`;

        // 新注册用户需要同意条款
        setTermsAccepted(false);
        setNeedsUsernameSetup(false);
        // 如果用户以前注册过并且同意了（比如重注册），清除旧的 consent
        // 但不影响当前这个全新注册流程
        clearConsent();
        return { success: true };
      }
      return { success: false, error: data.error || tf("registerFailed", "注册失败") };
    } catch (e: any) {
      return { success: false, error: e.message || tf("networkErrorMsg", "网络错误") };
    }
  };

  const acceptTerms = async (): Promise<boolean> => {
    // 1. 始终保存到 localStorage（离线场景也生效）
    saveConsent();
    setTermsAccepted(true);

    // 2. 同时同步到后端（接收失败不影响本地）
    if (!token) return true;
    try {
      const resp = await fetch(`${API_BASE}/api/auth/accept-terms`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.status === 401) {
        // token 过期 → 不清除本地 consent，只是静默忽略后端同步
        return true;
      }
      const data = await resp.json();
      return data.success !== false; // 后端失败也不影响本地
    } catch {
      return true; // 网络错误也不影响本地
    }
  };

  const updateProfile = async (data: { username?: string; avatar_color?: string }): Promise<{ success: boolean; error?: string }> => {
    if (!token) return { success: false, error: tf("notLoggedIn", "未登录") };
    try {
      const resp = await fetch(`${API_BASE}/api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      const result = await resp.json();
      if (result.success) {
        const updatedUser = { ...user!, ...result.user };
        setUser(updatedUser);
        localStorage.setItem("neuroaccess-user", JSON.stringify(updatedUser));
        return { success: true };
      }
      return { success: false, error: result.error || tf("failedToUpdateProfile", "更新失败") };
    } catch (e: any) {
      return { success: false, error: e.message || tf("networkErrorMsg", "网络错误") };
    }
  };

  const changePassword = async (data: { verification_code: string; new_password: string }): Promise<{ success: boolean; error?: string }> => {
    if (!token) return { success: false, error: tf("notLoggedIn", "未登录") };
    try {
      const resp = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${token}`,
        },
        body: new URLSearchParams({
          verification_code: data.verification_code,
          new_password: data.new_password,
        }),
      });
      const result = await resp.json();
      if (result.success) {
        return { success: true };
      }
      return { success: false, error: result.error || tf("failedToChangePasswordMsg", "修改失败") };
    } catch (e: any) {
      return { success: false, error: e.message || tf("networkErrorMsg", "网络错误") };
    }
  };

  const sendVerificationCode = async (data: { email?: string }): Promise<{ success: boolean; error?: string }> => {
    if (!token) return { success: false, error: tf("notLoggedIn", "未登录") };
    try {
      const resp = await fetch(`${API_BASE}/api/auth/verification-code`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      let result: any;
      try {
        result = await resp.json();
      } catch {
        result = { detail: tf("sendCodeFailed", "验证码发送失败") };
      }
      if (!resp.ok) {
        return { success: false, error: result.detail || result.error || tf("sendCodeFailed", "验证码发送失败") };
      }
      if (result.success) {
        return { success: true };
      }
      return { success: false, error: result.error || tf("sendFailed", "发送失败") };
    } catch (e: any) {
      return { success: false, error: e.message || tf("networkErrorMsg", "网络错误") };
    }
  };

  const updateEmail = async (data: { new_email: string; verification_code: string }): Promise<{ success: boolean; error?: string }> => {
    if (!token) return { success: false, error: tf("notLoggedIn", "未登录") };
    try {
      const resp = await fetch(`${API_BASE}/api/auth/confirm-email-change`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${token}`,
        },
        body: new URLSearchParams({
          new_email: data.new_email,
          verification_code: data.verification_code,
        }),
      });
      const result = await resp.json();
      if (result.success) {
        if (result.user) {
          const updatedUser = { ...user!, ...result.user };
          setUser(updatedUser);
          localStorage.setItem("neuroaccess-user", JSON.stringify(updatedUser));
        }
        return { success: true };
      }
      return { success: false, error: result.error || tf("failedToChangePasswordMsg", "修改失败") };
    } catch (e: any) {
      return { success: false, error: e.message || tf("networkErrorMsg", "网络错误") };
    }
  };

  const sendDeleteAccountCode = async (): Promise<{ success: boolean; error?: string }> => {
    if (!token) return { success: false, error: tf("notLoggedIn", "未登录") };
    try {
      const resp = await fetch(`${API_BASE}/api/auth/send-delete-account-code`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      let result: any;
      try {
        result = await resp.json();
      } catch {
        result = { detail: tf("sendCodeFailed", "验证码发送失败") };
      }
      if (!resp.ok) {
        return { success: false, error: result.detail || result.error || tf("sendCodeFailed", "验证码发送失败") };
      }
      if (result.success) {
        return { success: true };
      }
      return { success: false, error: result.error || tf("sendFailed", "发送失败") };
    } catch (e: any) {
      return { success: false, error: e.message || tf("networkErrorMsg", "网络错误") };
    }
  };

  const deleteAccount = async (data: { verification_code: string }): Promise<{ success: boolean; error?: string }> => {
    if (!token) return { success: false, error: tf("notLoggedIn", "未登录") };
    try {
      const resp = await fetch(`${API_BASE}/api/auth/confirm-delete-account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${token}`,
        },
        body: new URLSearchParams({
          verification_code: data.verification_code,
        }),
      });
      const result = await resp.json();
      if (result.success) {
        setToken(null);
        setUser(null);
        setTermsAccepted(false);
        setNeedsUsernameSetup(false);
        localStorage.removeItem("neuroaccess-token");
        localStorage.removeItem("neuroaccess-user");
        // 删除账号时清除同意记录
        clearConsent();
        return { success: true };
      }
      return { success: false, error: result.error || tf("deleteAccountFailed", "删除失败") };
    } catch (e: any) {
      return { success: false, error: e.message || tf("networkErrorMsg", "网络错误") };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setTermsAccepted(false);
    setNeedsUsernameSetup(false);
    localStorage.removeItem("neuroaccess-token");
    localStorage.removeItem("neuroaccess-user");
    // 注销时 NOT 清除同意记录，这样重新登录后不再显示弹窗
    // 只有用户主动删除账号才会清除
    document.cookie = "neuroaccess-token=; path=/; max-age=0";
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem("neuroaccess-user", JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading, updateUser, updateProfile, changePassword, sendVerificationCode, updateEmail, sendDeleteAccountCode, deleteAccount, termsAccepted, needsUsernameSetup, acceptTerms, setNeedsUsernameSetup }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
