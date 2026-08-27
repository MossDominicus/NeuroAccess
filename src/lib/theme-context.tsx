"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

type Theme = "light" | "dark" | "system";

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // 惰性初始化：客户端直接读 localStorage，避免首帧用默认 light 覆盖已保存的 dark 造成"闪亮"
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    try {
      const saved = localStorage.getItem("theme") as Theme | null;
      return saved === "dark" || saved === "system" ? saved : "light";
    } catch {
      return "light";
    }
  });

  // 同步 document.documentElement.class
  useEffect(() => {
    const root = document.documentElement;

    function applyTheme(t: Theme) {
      if (t === "system") {
        const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        root.classList.toggle("dark", isDark);
      } else {
        root.classList.toggle("dark", t === "dark");
      }
    }

    applyTheme(theme);
    try { localStorage.setItem("theme", theme); } catch {}

    // 监听系统主题变化（仅 system 模式需要）
    if (theme === "system") {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      function handler(e: MediaQueryListEvent) {
        root.classList.toggle("dark", e.matches);
      }
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    }
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx)
    throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
