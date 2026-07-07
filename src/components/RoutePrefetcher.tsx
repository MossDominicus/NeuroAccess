"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const ROUTES = [
  "/",
  "/cases",
  "/guide",
  "/reports",
  "/eeg-simulator",
  "/login",
  "/register",
  "/account",
  "/privacy",
  "/terms",
  "/disclaimer",
];

/**
 * 页面加载后立即预加载所有路由的 JS chunk，消除首次页面切换延迟
 */
export default function RoutePrefetcher() {
  const router = useRouter();

  useEffect(() => {
    // 延迟 500ms 后开始预加载，不干扰首屏渲染
    const timer = setTimeout(() => {
      try {
        for (const route of ROUTES) {
          router.prefetch(route);
        }
      } catch {}
    }, 500);
    return () => clearTimeout(timer);
  }, [router]);

  return null;
}
