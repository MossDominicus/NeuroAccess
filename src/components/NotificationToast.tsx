"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface Notification {
  id: string;
  message: string;
  type: "info" | "success" | "error";
  timestamp: number;
}

// 全局通知状态（模块级单例）
let _notifications: Notification[] = [];
let _listeners: Set<(ns: Notification[]) => void> = new Set();

function notify(listeners: Set<(ns: Notification[]) => void>) {
  listeners.forEach((l) => l([..._notifications]));
}

// 用 Web Audio API 合成简短通知音（避免外部资源）
function playTone(type: "success" | "error") {
  if (typeof window === "undefined") return;
  if (localStorage.getItem("neuroaccess-notifications") === "false") return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    if (type === "success") {
      // C5 → E5 双音
      [523.25, 659.25].forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = freq;
        g.gain.setValueAtTime(0, now + i * 0.12);
        g.gain.linearRampToValueAtTime(0.18, now + i * 0.12 + 0.02);
        g.gain.linearRampToValueAtTime(0, now + i * 0.12 + 0.15);
        o.connect(g).connect(ctx.destination);
        o.start(now + i * 0.12);
        o.stop(now + i * 0.12 + 0.18);
      });
    } else {
      // 失败：单音下滑
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "square";
      o.frequency.setValueAtTime(330, now);
      o.frequency.linearRampToValueAtTime(220, now + 0.25);
      g.gain.setValueAtTime(0.15, now);
      g.gain.linearRampToValueAtTime(0, now + 0.25);
      o.connect(g).connect(ctx.destination);
      o.start(now);
      o.stop(now + 0.3);
    }
  } catch (e) { /* 忽略音频错误 */ }
}

export function addNotification(message: string, type: "info" | "success" | "error" = "info") {
  const N = { id: Math.random().toString(36).slice(2), message, type, timestamp: Date.now() };
  _notifications = [..._notifications, N];
  notify(_listeners);
  if (type === "success" || type === "error") playTone(type);
  // 自动消除
  setTimeout(() => {
    _notifications = _notifications.filter((n) => n.id !== N.id);
    notify(_listeners);
  }, 5000);
}

// 通知 toast 层（放在 layout 里）
export default function NotificationToast() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("neuroaccess-notifications");
    if (stored === "false") setEnabled(false);
  }, []);

  useEffect(() => {
    const listener = (ns: Notification[]) => setNotifications(ns);
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
  }, []);

  if (!enabled) return null;

  return (
    <div className="fixed top-4 right-4 z-[10001] flex flex-col gap-2 max-w-sm pointer-events-none">
      <AnimatePresence>
        {notifications.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className={`rounded-xl px-4 py-3 shadow-lg border text-sm flex items-start gap-2 pointer-events-auto ${
              n.type === "success"
                ? "bg-emerald-950/90 border-emerald-700/50 text-emerald-300"
                : n.type === "error"
                  ? "bg-red-950/90 border-red-700/50 text-red-300"
                  : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)]"
            }`}
          >
            <span className="flex-1">{n.message}</span>
            <button
              onClick={() => {
                _notifications = _notifications.filter((x) => x.id !== n.id);
                notify(_listeners);
              }}
              className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function isNotificationEnabled(): boolean {
  return localStorage.getItem("neuroaccess-notifications") !== "false";
}

export function setNotificationEnabled(enabled: boolean) {
  localStorage.setItem("neuroaccess-notifications", String(enabled));
}
