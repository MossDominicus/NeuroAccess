"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Cloudflare Turnstile 钩子：
 * - 加载脚本 + 渲染隐藏 widget（带回调）
 * - execute() 触发验证，返回 Promise<token>
 */
export function useTurnstile(siteKey: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const resolveRef = useRef<((token: string) => void) | null>(null);
  const cbName = useRef(`__ts_exec_cb_${Date.now()}`);

  // 加载脚本 + 渲染隐藏 widget（注册全局回调）
  useEffect(() => {
    if (!siteKey) return;

    // 全局回调：Turnstile 验证通过时调用
    (window as any)[cbName.current] = (token: string) => {
      if (resolveRef.current) {
        resolveRef.current(token);
        resolveRef.current = null;
      }
    };

    const init = () => {
      if (!containerRef.current || widgetId.current) return;
      if (!(window as any).turnstile) {
        setTimeout(init, 200);
        return;
      }
      try {
        widgetId.current = (window as any).turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: cbName.current,
        });
      } catch {}
    };

    if (!(window as any).turnstile) {
      if (!document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')) {
        const s = document.createElement("script");
        s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
        s.async = true;
        s.defer = true;
        s.onload = () => init();
        document.head.appendChild(s);
      } else {
        setTimeout(init, 200);
      }
    } else {
      init();
    }

    return () => {
      if (widgetId.current && (window as any).turnstile) {
        try { (window as any).turnstile.remove(widgetId.current); } catch {}
        widgetId.current = null;
      }
      resolveRef.current = null;
    };
  }, [siteKey]);

  /**
   * 触发验证，返回 token。
   */
  const execute = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!siteKey) {
        resolve("");
        return;
      }

      resolveRef.current = resolve;

      const tryExec = (n: number) => {
        if (n > 100) { resolve(""); return; }
        if (!containerRef.current || !(window as any).turnstile) {
          setTimeout(() => tryExec(n + 1), 100);
          return;
        }
        try {
          (window as any).turnstile.reset(containerRef.current);
          (window as any).turnstile.execute(containerRef.current);
        } catch {
          resolve(null);
        }
      };
      tryExec(0);
    });
  }, [siteKey]);

  return { execute, containerRef };
}
