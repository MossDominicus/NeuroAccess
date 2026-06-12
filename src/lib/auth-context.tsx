"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLang } from "./language-context";

interface User {
  id: number;
  username: string;
  email: string;
  phone?: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (usernameOrEmail: string, password: string) => Promise<{ success: boolean; error?: string; termsAccepted?: boolean; needsUsernameSetup?: boolean }>;
  register: (username: string, email: string, password: string, code?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
  updateUser: (user: User) => void;
  updateProfile: (data: { username?: string; avatar_url?: string }) => Promise<{ success: boolean; error?: string }>;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [needsUsernameSetup, setNeedsUsernameSetup] = useState(false);
  const { t } = useLang();

  useEffect(() => {
    // Load token and terms state from localStorage
    try {
      const savedToken = localStorage.getItem("neuroaccess-token");
      const savedUser = localStorage.getItem("neuroaccess-user");
      const savedTerms = localStorage.getItem("neuroaccess-terms-accepted");
      if (savedToken && savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsedUser);
        // Restore terms accepted state so popup doesn't reappear on refresh
        if (savedTerms === "true") {
          setTermsAccepted(true);
        }
      }
    } catch {}
    setLoading(false);
  }, []);

  const tf = (key: string, fb: string) => { const v = t(key); return v === key ? fb : v; };

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
        // 同步写 cookie，供 middleware 读取
        document.cookie = `neuroaccess-token=${data.token}; path=/; max-age=2592000`;
        // Handle terms acceptance and username setup flags
        const ta = !!data.terms_accepted;
        const nu = !!data.needs_username_setup;
        setNeedsUsernameSetup(nu);
        // termsAccepted: 仅首次注册时要求勾选，后续登录不再重置
        // 如果 localStorage 已标记为同意，保持 true
        const savedTerms = localStorage.getItem("neuroaccess-terms-accepted");
        if (savedTerms === "true") {
          setTermsAccepted(true);
        } else {
          setTermsAccepted(ta);
          localStorage.setItem("neuroaccess-terms-accepted", ta ? "true" : "false");
        }
        return { success: true, termsAccepted: ta, needsUsernameSetup: nu };
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
        // New registered users also need to accept terms
        setTermsAccepted(false);
        setNeedsUsernameSetup(false);
        localStorage.removeItem("neuroaccess-terms-accepted");
        return { success: true };
      }
      return { success: false, error: data.error || tf("registerFailed", "注册失败") };
    } catch (e: any) {
      return { success: false, error: e.message || tf("networkErrorMsg", "网络错误") };
    }
  };

  const acceptTerms = async (): Promise<boolean> => {
    if (!token) return false;
    try {
      const resp = await fetch(`${API_BASE}/api/auth/accept-terms`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (data.success) {
        setTermsAccepted(true);
        localStorage.setItem("neuroaccess-terms-accepted", "true");
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const updateProfile = async (data: { username?: string; avatar_url?: string }): Promise<{ success: boolean; error?: string }> => {
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
        // 账号已删除，清除本地状态
        setToken(null);
        setUser(null);
        setTermsAccepted(false);
        setNeedsUsernameSetup(false);
        localStorage.removeItem("neuroaccess-token");
        localStorage.removeItem("neuroaccess-user");
        localStorage.removeItem("neuroaccess-terms-accepted");
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
    localStorage.removeItem("neuroaccess-terms-accepted");
    // 同步清除 cookie
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
