"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLang } from "./language-context";

interface User {
  id: number;
  username: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (usernameOrEmail: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLang();

  useEffect(() => {
    // Load token from localStorage
    try {
      const savedToken = localStorage.getItem("neuroaccess-token");
      const savedUser = localStorage.getItem("neuroaccess-user");
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    } catch {}
    setLoading(false);
  }, []);

  const login = async (usernameOrEmail: string, password: string): Promise<{ success: boolean; error?: string }> => {
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
        return { success: true };
      }
      return { success: false, error: data.error || "Login failed" };
    } catch (e: any) {
      return { success: false, error: e.message || "Network error" };
    }
  };

  const register = async (username: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const resp = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username, email, password }),
      });
      const data = await resp.json();
      if (data.success) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem("neuroaccess-token", data.token);
        localStorage.setItem("neuroaccess-user", JSON.stringify(data.user));
        return { success: true };
      }
      return { success: false, error: data.error || "Registration failed" };
    } catch (e: any) {
      return { success: false, error: e.message || "Network error" };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("neuroaccess-token");
    localStorage.removeItem("neuroaccess-user");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
