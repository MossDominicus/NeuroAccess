"use client";

import { useEffect, useRef } from "react";

interface Props {
  siteKey: string;
  open: boolean;
  onVerify: (token: string) => void;
  onClose?: () => void;
}

export default function TurnstileModal({ siteKey, open, onVerify, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const cbName = useRef(`__turnstile_cb_${Date.now()}`);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open || !siteKey) return;

    const doVerify = (token: string) => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      onVerify(token);
    };

    (window as any)[cbName.current] = doVerify;

    const renderWidget = () => {
      if (!containerRef.current) return;
      if (widgetId.current) return;
      if (!(window as any).turnstile) { setTimeout(renderWidget, 100); return; }
      try {
        widgetId.current = (window as any).turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: cbName.current,
          "expired-callback": cbName.current,
          theme: "auto",
        });
        // 轮询 hidden input，兜底 callback 不触发的情况
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(() => {
          const resp = containerRef.current?.querySelector('input[name="cf-turnstile-response"]') as HTMLInputElement | null;
          if (resp && resp.value) {
            doVerify(resp.value);
          }
        }, 300);
      } catch {}
    };

    if (!(window as any).turnstile) {
      if (!document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')) {
        const s = document.createElement("script");
        s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
        s.async = true;
        s.defer = true;
        s.onload = () => setTimeout(renderWidget, 50);
        document.head.appendChild(s);
      } else {
        renderWidget();
      }
    } else {
      renderWidget();
    }

    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      if (widgetId.current && (window as any).turnstile) {
        try { (window as any).turnstile.remove(widgetId.current); } catch {}
        widgetId.current = null;
      }
      delete (window as any)[cbName.current];
    };
  }, [open, siteKey]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--color-surface)] rounded-2xl p-8 shadow-2xl border border-[var(--color-border)] max-w-sm w-full mx-4 text-center relative">
        <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center mx-auto mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-primary)]"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
        </div>
        <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">人机验证</h3>
        <div ref={containerRef} className="cf-turnstile flex justify-center" data-theme="auto" />
        {onClose && (
          <button onClick={onClose} className="mt-4 px-4 py-2 rounded-xl text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors">取消</button>
        )}
      </div>
    </div>
  );
}
