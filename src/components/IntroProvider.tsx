"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import nextDynamic from "next/dynamic";

const IntroAnimation = nextDynamic(() => import("@/components/IntroAnimation"), {
  ssr: false,
  loading: () => null,
});

/**
 * 启动动画全局提供者
 * 在 layout 中所有容器之外渲染，确保全屏覆盖
 */
export default function IntroProvider({ children }: { children: ReactNode }) {
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    const forced = new URLSearchParams(window.location.search).get("intro");
    if (forced === "1") {
      window.sessionStorage.removeItem("neuroaccess-intro-played");
      setShowIntro(true);
    } else {
      const played = window.sessionStorage.getItem("neuroaccess-intro-played");
      if (played !== "true") setShowIntro(true);
    }
  }, []);

  const handleIntroComplete = useCallback(() => {
    window.sessionStorage.setItem("neuroaccess-intro-played", "true");
    setShowIntro(false);
  }, []);

  const replayIntro = useCallback(() => {
    window.sessionStorage.removeItem("neuroaccess-intro-played");
    setShowIntro(true);
  }, []);
  useEffect(() => {
    (window as any).__replayIntro = replayIntro;
    return () => { delete (window as any).__replayIntro; };
  }, [replayIntro]);

  return (
    <>
      {showIntro && <IntroAnimation onComplete={handleIntroComplete} />}
      {children}
    </>
  );
}
