"use client";

import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";
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
  login: (usernameOrEmail: string, password: string, cfToken?: string) => Promise<{ success: boolean; error?: string; needsCaptcha?: boolean; termsAccepted?: boolean; needsUsernameSetup?: boolean }>;
  register: (username: string, email: string, password: string, code?: string, cfToken?: string) => Promise<{ success: boolean; error?: string; needsCaptcha?: boolean }>;
  sendLoginCode: (email: string) => Promise<{ success: boolean; error?: string }>;
  loginWithCode: (email: string, code: string, cfToken?: string) => Promise<{ success: boolean; error?: string; needsCaptcha?: boolean; termsAccepted?: boolean; needsUsernameSetup?: boolean }>;
  logout: () => void;
  loading: boolean;
  updateUser: (user: User) => void;
  updateProfile: (data: { username?: string; avatar_color?: string }) => Promise<{ success: boolean; error?: string }>;
  changePassword: (data: { verification_code: string; new_password: string }) => Promise<{ success: boolean; error?: string }>;
  sendVerificationCode: (data: { email?: string }) => Promise<{ success: boolean; error?: string }>;
  updateEmail: (data: { new_email: string; verification_code: string }) => Promise<{ success: boolean; error?: string }>;
  sendOldEmailCode: () => Promise<{ success: boolean; error?: string }>;
  verifyOldEmail: (code: string) => Promise<{ success: boolean; error?: string }>;
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

const SECURE_COOKIE = typeof window !== "undefined" && window.location.protocol === "https:" ? "Secure; " : "";

function setAuthCookie(token: string, maxAge: number) {
  document.cookie = `neuroaccess-token=${token}; path=/; ${SECURE_COOKIE}SameSite=Lax; max-age=${maxAge}`;
}

function clearAuthCookie() {
  document.cookie = `neuroaccess-token=; path=/; ${SECURE_COOKIE}SameSite=Lax; max-age=0`;
}

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

/** 解码 JWT 获取过期时间（毫秒），失败返回 null */
function decodeJwtExpiry(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    // Base64 URL-safe decode
    const decoded = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    );
    if (decoded.exp) {
      return decoded.exp * 1000; // seconds → milliseconds
    }
    return null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsUsernameSetup, setNeedsUsernameSetup] = useState(false);

  // termsAccepted 从 localStorage consent 记录初始化，不依赖后端
  const [termsAccepted, setTermsAccepted] = useState(false);

  // ── 跨设备会话失效检测 ──────────────────────────────
  // 账号可能在其它设备被注销/删除，或 token 已失效。被动信任 localStorage
  // 缓存会让其它设备一直显示"已登录"，因此每次启动 / 页面重新可见时都向服务端校验一次。
  const handleSessionInvalid = useCallback(() => {
    try {
      localStorage.removeItem("neuroaccess-token");
      localStorage.removeItem("neuroaccess-user");
    } catch {}
    clearAuthCookie();
    setToken(null);
    setUser(null);
  }, []);

  // ── 跨设备报告同步 ──────────────────────────
  // 会话有效（登录成功 / 启动校验 / 页面重新可见）时调用：把本机独有报告推送到服务端，
  // 并拉取其它设备的报告。服务端是多设备真相源，本地 localStorage 仅作离线缓存。
  const syncReportsOnLogin = useCallback(async () => {
    try {
      const { loadReports, saveReports, fetchServerReports, syncReportToServer } =
        await import("@/lib/reports-storage");
      const serverReports = await fetchServerReports();
      if (serverReports === null) return; // 网络异常 / 未登录：保留本地，不改动
      const localReports = loadReports();
      const serverIds = new Set(serverReports.map((r: any) => r.id));
      const localOnly = localReports.filter((r: any) => !serverIds.has(r.id));
      // 把本机独有（尚未上云）的报告推送到服务端
      for (const r of localOnly) {
        try { await syncReportToServer(r); } catch {}
      }
      // 合并：服务端报告作为真相源覆盖本地同名报告 + 本机独有报告，写回本地缓存
      const merged = [...serverReports, ...localOnly];
      saveReports(merged);
    } catch {}
  }, []);

  const validateSession = useCallback(async (tok: string) => {
    try {
      const resp = await fetch(`${API_BASE}/api/auth/me`, {
        method: "GET",
        headers: { Authorization: `Bearer ${tok}` },
      });
      // 401 = 凭证失效 / 用户已被删除 → 静默处理，不自动退出（用户要求永久保留登录）
      if (resp.status === 401) {
        // 不退出登录，保留当前状态
        return;
      }
      if (resp.ok) {
        // 会话有效：同步跨设备报告（推送本机独有 + 拉取其它设备）
        await syncReportsOnLogin();
      }
    } catch {
      // 网络 / 服务异常：保留当前状态，下次校验再判断
    }
  }, [handleSessionInvalid, syncReportsOnLogin]);

  useEffect(() => {
    // 加载 token、用户、同意记录
    try {
      const savedToken = localStorage.getItem("neuroaccess-token");
      const savedUser = localStorage.getItem("neuroaccess-user");
      if (savedToken && savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsedUser);
        // 关键修复：向服务端校验会话是否仍然有效（账号可能已在其它设备被注销）
        validateSession(savedToken);
      }
      // 检查本地 consent 记录（页面刷新时不显示弹窗）
      if (loadConsent()) {
        setTermsAccepted(true);
      }
    } catch {}
    setLoading(false);
  }, []);

  // ── Token 过期自动登出（已禁用：用户要求永久保留登录）────
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const clearLogoutTimer = () => {};

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const scheduleLogout = (_jwtToken: string) => {};

  // Schedule logout on mount if token exists（已禁用）
  useEffect(() => {
    // Token 过期自动登出功能已永久禁用
    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // 标签页重新可见时重新校验会话（捕捉"账号在其它设备被删除"的情况）
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVisible = () => {
      if (document.visibilityState === "visible" && token) {
        validateSession(token);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [token, validateSession]);

  const { t } = useLang();

  const tf = (key: string, fb: string) => { const v = t(key); return v === key ? fb : v; };

  const login = async (usernameOrEmail: string, password: string, captchaToken?: string): Promise<{ success: boolean; error?: string; needsCaptcha?: boolean; termsAccepted?: boolean; needsUsernameSetup?: boolean }> => {
    try {
      const params = new URLSearchParams({ username_or_email: usernameOrEmail, password });
      if (captchaToken) params.append("captcha_token", captchaToken);
      const resp = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      });
      const data = await resp.json();
      if (data.success) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem("neuroaccess-token", data.token);
        localStorage.setItem("neuroaccess-user", JSON.stringify(data.user));
        setAuthCookie(data.token, 2592000);
        scheduleLogout(data.token);

        const nu = !!data.needs_username_setup;
        setNeedsUsernameSetup(nu);
        if (loadConsent()) { setTermsAccepted(true); }
        else if (data.terms_accepted) { saveConsent(); setTermsAccepted(true); }
        else { setTermsAccepted(false); }
        await syncReportsOnLogin();
        return { success: true, termsAccepted: !!data.terms_accepted, needsUsernameSetup: nu };
      }
      if (data.needsCaptcha) {
        return { success: false, needsCaptcha: true, error: data.error };
      }
      return { success: false, error: data.error || data.detail || tf("loginFailed", "Login failed") };
    } catch (e: any) {
      return { success: false, error: e.message || tf("networkErrorMsg", "Network error") };
    }
  };

  const register = async (username: string, email: string, password: string, code: string = "", captchaToken?: string): Promise<{ success: boolean; error?: string; needsCaptcha?: boolean }> => {
    try {
      const params = new URLSearchParams({ username, email, password, code });
      if (captchaToken) params.append("captcha_token", captchaToken);
      const resp = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      });
      const data = await resp.json();
      if (data.success) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem("neuroaccess-token", data.token);
        localStorage.setItem("neuroaccess-user", JSON.stringify(data.user));
        setAuthCookie(data.token, 2592000);
        scheduleLogout(data.token);

        // 新注册用户需要同意条款
        setTermsAccepted(false);
        setNeedsUsernameSetup(false);
        // 如果用户以前注册过并且同意了（比如重注册），清除旧的 consent
        // 但不影响当前这个全新注册流程
        clearConsent();
        // 清除可能遗留的旧账号 local 数据
        //（销号后从另一台设备重新注册，旧 localStorage 还在）
        localStorage.removeItem("neuroaccess-reports");
        localStorage.removeItem("neuroaccess-feedback");
        localStorage.removeItem("neuroaccess-survey");
        return { success: true };
      }
      if (data.needsCaptcha) {
        return { success: false, needsCaptcha: true, error: data.error };
      }
      return { success: false, error: data.error || tf("registerFailed", "Registration failed") };
    } catch (e: any) {
      return { success: false, error: e.message || tf("networkErrorMsg", "Network error") };
    }
  };

  const sendLoginCode = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const resp = await fetch(`${API_BASE}/api/auth/send-login-code`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ email }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        return { success: false, error: data.detail || data.error || tf("sendCodeFailed", "Failed to send code") };
      }
      if (data.success) {
        return { success: true };
      }
      return { success: false, error: data.error || tf("sendCodeFailed", "Failed to send code") };
    } catch (e: any) {
      return { success: false, error: e.message || tf("networkErrorMsg", "Network error") };
    }
  };

  const loginWithCode = async (email: string, code: string, captchaToken?: string): Promise<{ success: boolean; error?: string; needsCaptcha?: boolean; termsAccepted?: boolean; needsUsernameSetup?: boolean }> => {
    try {
      const params = new URLSearchParams({ email, code });
      if (captchaToken) params.append("captcha_token", captchaToken);
      const resp = await fetch(`${API_BASE}/api/auth/login-with-code`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      });
      const data = await resp.json();
      if (data.success) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem("neuroaccess-token", data.token);
        localStorage.setItem("neuroaccess-user", JSON.stringify(data.user));
        setAuthCookie(data.token, 2592000);
        scheduleLogout(data.token);
        const nu = !!data.needs_username_setup;
        setNeedsUsernameSetup(nu);
        if (loadConsent()) {
          setTermsAccepted(true);
        } else if (data.terms_accepted) {
          saveConsent();
          setTermsAccepted(true);
        }
        await syncReportsOnLogin();
        return { success: true, termsAccepted: !!data.terms_accepted, needsUsernameSetup: nu };
      }
      if (data.needsCaptcha) {
        return { success: false, needsCaptcha: true, error: data.error };
      }
      return { success: false, error: data.error || tf("verificationCodeFailed", "Verification failed") };
    } catch (e: any) {
      return { success: false, error: e.message || tf("networkErrorMsg", "Network error") };
    }
  };

  const sendOldEmailCode = async (): Promise<{ success: boolean; error?: string }> => {
    if (!token) return { success: false, error: tf("notLoggedIn", "Not logged in") };
    try {
      const resp = await fetch(`${API_BASE}/api/auth/send-old-email-code`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await resp.json();
      if (!resp.ok) {
        return { success: false, error: result.detail || result.error || tf("sendCodeFailed", "Failed to send code") };
      }
      if (result.success) return { success: true };
      return { success: false, error: result.error || tf("sendCodeFailed", "Failed to send code") };
    } catch (e: any) {
      return { success: false, error: e.message || tf("networkErrorMsg", "Network error") };
    }
  };

  const verifyOldEmail = async (code: string): Promise<{ success: boolean; error?: string }> => {
    if (!token) return { success: false, error: tf("notLoggedIn", "Not logged in") };
    try {
      const resp = await fetch(`${API_BASE}/api/auth/verify-old-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${token}`,
        },
        body: new URLSearchParams({ code }),
      });
      const result = await resp.json();
      if (result.success) return { success: true };
      return { success: false, error: result.error || tf("verificationCodeFailed", "Verification failed") };
    } catch (e: any) {
      return { success: false, error: e.message || tf("networkErrorMsg", "Network error") };
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
    if (!token) return { success: false, error: tf("notLoggedIn", "Not logged in") };
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
        const updatedUser = result.user ? { ...(user || {}), ...result.user } as User : user!;
        if (updatedUser) {
          setUser(updatedUser);
          localStorage.setItem("neuroaccess-user", JSON.stringify(updatedUser));
        }
        return { success: true };
      }
      return { success: false, error: result.error || tf("failedToUpdateProfile", "Profile update failed") };
    } catch (e: any) {
      return { success: false, error: e.message || tf("networkErrorMsg", "Network error") };
    }
  };

  const changePassword = async (data: { verification_code: string; new_password: string }): Promise<{ success: boolean; error?: string }> => {
    if (!token) return { success: false, error: tf("notLoggedIn", "Not logged in") };
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
      return { success: false, error: result.error || tf("failedToChangePasswordMsg", "Password change failed") };
    } catch (e: any) {
      return { success: false, error: e.message || tf("networkErrorMsg", "Network error") };
    }
  };

  const sendVerificationCode = async (data: { email?: string }): Promise<{ success: boolean; error?: string }> => {
    if (!token) return { success: false, error: tf("notLoggedIn", "Not logged in") };
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
        result = { detail: tf("sendCodeFailed", "Failed to send verification code") };
      }
      if (!resp.ok) {
        return { success: false, error: result.detail || result.error || tf("sendCodeFailed", "Failed to send verification code") };
      }
      if (result.success) {
        return { success: true };
      }
      return { success: false, error: result.error || tf("sendFailed", "Send failed") };
    } catch (e: any) {
      return { success: false, error: e.message || tf("networkErrorMsg", "Network error") };
    }
  };

  const updateEmail = async (data: { new_email: string; verification_code: string }): Promise<{ success: boolean; error?: string }> => {
    if (!token) return { success: false, error: tf("notLoggedIn", "Not logged in") };
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
          const updatedUser = { ...(user || {}), ...result.user } as User;
          setUser(updatedUser);
          localStorage.setItem("neuroaccess-user", JSON.stringify(updatedUser));
        }
        return { success: true };
      }
      return { success: false, error: result.error || "Email change failed" };
    } catch (e: any) {
      return { success: false, error: e.message || tf("networkErrorMsg", "Network error") };
    }
  };

  const sendDeleteAccountCode = async (): Promise<{ success: boolean; error?: string }> => {
    if (!token) return { success: false, error: tf("notLoggedIn", "Not logged in") };
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
        result = { detail: tf("sendCodeFailed", "Failed to send verification code") };
      }
      if (!resp.ok) {
        return { success: false, error: result.detail || result.error || tf("sendCodeFailed", "Failed to send verification code") };
      }
      if (result.success) {
        return { success: true };
      }
      return { success: false, error: result.error || tf("sendFailed", "Send failed") };
    } catch (e: any) {
      return { success: false, error: e.message || tf("networkErrorMsg", "Network error") };
    }
  };

  const deleteAccount = async (data: { verification_code: string }): Promise<{ success: boolean; error?: string }> => {
    if (!token) return { success: false, error: tf("notLoggedIn", "Not logged in") };
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
      if (!resp.ok) {
        return { success: false, error: result.detail || result.error || tf("deleteAccountFailed", "Account deletion failed") };
      }
      if (result.success) {
        setToken(null);
        setUser(null);
        setTermsAccepted(false);
        setNeedsUsernameSetup(false);
        localStorage.removeItem("neuroaccess-token");
        localStorage.removeItem("neuroaccess-user");
        localStorage.removeItem("neuroaccess-reports");
        localStorage.removeItem("neuroaccess-feedback");
        localStorage.removeItem("neuroaccess-survey");
        // 删除账号时清除同意记录
        clearConsent();
        return { success: true };
      }
      return { success: false, error: result.error || tf("deleteAccountFailed", "Account deletion failed") };
    } catch (e: any) {
      return { success: false, error: e.message || tf("networkErrorMsg", "Network error") };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setTermsAccepted(false);
    setNeedsUsernameSetup(false);
    localStorage.removeItem("neuroaccess-token");
    localStorage.removeItem("neuroaccess-user");
    // 注销时清除问卷本地记录，防止未登录状态下看到已提交状态
    localStorage.removeItem("neuroaccess-survey");
    // 注销时 NOT 清除同意记录，这样重新登录后不再显示弹窗
    // 只有用户主动删除账号才会清除
    clearAuthCookie();
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem("neuroaccess-user", JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, sendLoginCode, loginWithCode, logout, loading, updateUser, updateProfile, changePassword, sendVerificationCode, updateEmail, sendOldEmailCode, verifyOldEmail, sendDeleteAccountCode, deleteAccount, termsAccepted, needsUsernameSetup, acceptTerms, setNeedsUsernameSetup }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
