"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import nextDynamic from "next/dynamic";
import { useAppEvents } from "@/lib/app-events";

// 立即预加载 IntroAnimation，减少首次加载卡顿
const IntroAnimation = nextDynamic(() => import("@/components/IntroAnimation"), {
  ssr: false,
  loading: () => <div className="fixed inset-0 z-[100] bg-[#0a0e1a]" />,
});

/**
 * 启动动画全局提供者
 * 初始化时立即检查 sessionStorage，避免首次渲染闪白
 */
export default function IntroProvider({ children }: { children: ReactNode }) {
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === "undefined") return false;
    const forced = new URLSearchParams(window.location.search).get("intro");
    if (forced === "1") {
      window.sessionStorage.removeItem("neuroaccess-intro-played");
      return true;
    }
    return window.sessionStorage.getItem("neuroaccess-intro-played") !== "true";
  });
  const { setReplayIntro } = useAppEvents();

  const handleIntroComplete = useCallback(() => {
    window.sessionStorage.setItem("neuroaccess-intro-played", "true");
    setShowIntro(false);
  }, []);

  const replayIntro = useCallback(() => {
    window.sessionStorage.removeItem("neuroaccess-intro-played");
    setShowIntro(true);
  }, []);
  useEffect(() => {
    setReplayIntro(() => replayIntro);
  }, [replayIntro, setReplayIntro]);

  return (
    <>
      {showIntro && <IntroAnimation onComplete={handleIntroComplete} />}
      {children}
    </>
  );
}
