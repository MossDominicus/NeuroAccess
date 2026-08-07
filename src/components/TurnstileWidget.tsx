"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useCallback } from "react";

interface TurnstileWidgetProps {
  /** Turnstile site key from env NEXT_PUBLIC_TURNSTILE_SITE_KEY */
  siteKey: string;
  /** Called when verification succeeds with the token */
  onVerify: (token: string) => void;
  /** Called when verification expires (user should re-verify) */
  onExpire?: () => void;
}

export interface TurnstileHandle {
  /** 重置验证（强制用户重新验证） */
  reset: () => void;
}

/**
 * Cloudflare Turnstile 人机验证组件（始终内嵌显示）
 *
 * 使用方式：
 *   <TurnstileWidget
 *     ref={turnstileRef}
 *     siteKey={...}
 *     onVerify={(token) => setTurnstileToken(token)}
 *   />
 *
 * 当 siteKey 为空时（开发模式），自动跳过验证。
 */
const TurnstileWidget = forwardRef<TurnstileHandle, TurnstileWidgetProps>(function TurnstileWidget(
  { siteKey, onVerify, onExpire },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const loaded = useRef(false);

  const cbName = useRef(`__turnstile_cb_${Date.now()}`);
  const expireCbName = useRef(`__turnstile_exp_${Date.now()}`);

  const handleVerify = useCallback((token: string) => onVerify(token), [onVerify]);
  const handleExpire = useCallback(() => onExpire?.(), [onExpire]);

  useImperativeHandle(ref, () => ({
    reset: () => {
      onVerify("");
      if (widgetId.current && (window as any).turnstile) {
        try {
          (window as any).turnstile.reset(widgetId.current);
        } catch {}
      }
    },
  }));

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;
    (window as any)[cbName.current] = handleVerify;
    (window as any)[expireCbName.current] = handleExpire;

    const renderWidget = () => {
      if (!containerRef.current || (window as any).turnstile === undefined) return;
      if (widgetId.current) return;
      try {
        widgetId.current = (window as any).turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: cbName.current,
          "expired-callback": expireCbName.current,
          theme: "auto",
        });
      } catch {}
    };

    if (!loaded.current) {
      loaded.current = true;
      if ((window as any).turnstile) {
        renderWidget();
      } else {
        const checkExist = setInterval(() => {
          if ((window as any).turnstile) {
            clearInterval(checkExist);
            renderWidget();
          }
        }, 100);
        if (!document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')) {
          const s = document.createElement("script");
          s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
          s.async = true;
          s.defer = true;
          s.onload = () => setTimeout(renderWidget, 50);
          document.head.appendChild(s);
        }
      }
    } else {
      renderWidget();
    }

    return () => {
      if (widgetId.current && (window as any).turnstile) {
        try {
          (window as any).turnstile.remove(widgetId.current);
        } catch {}
        widgetId.current = null;
      }
    };
  }, [siteKey, handleVerify, handleExpire]);

  if (!siteKey) return null;
  return (
    <div
      ref={containerRef}
      className="cf-turnstile flex justify-center"
      data-theme="auto"
    />
  );
});

export default TurnstileWidget;

