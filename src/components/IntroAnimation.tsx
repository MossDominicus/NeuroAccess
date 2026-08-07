"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/language-context";

function generateEeg(seed: number, len: number): number[] {
  let s = seed;
  const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const gauss = () => {
    let u = rand(), v = rand();
    while (u < 1e-15) u = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  const sig = new Array(len);

  // 模拟不规则 EEG：随机调幅 + 高噪声 + 微瞬态
  let phaseAlpha = rand() * Math.PI * 2;
  let phaseBeta = rand() * Math.PI * 2;
  let phaseTheta = rand() * Math.PI * 2;
  let ampAlpha = 0.40 + rand() * 0.15;
  let ampAlphaTarget = 0.35 + rand() * 0.20;
  let driftVal = 0;

  for (let x = 0; x < len; x++) {
    const dt = 1 / 200; // ~5ms per sample

    // alpha 振幅缓慢随机漂移（模拟睁眼/闭眼 alpha 差异）
    const alphaCycle = x / 80; // ~80 samples per alpha cycle
    if (x % 20 === 0) ampAlphaTarget = 0.30 + rand() * 0.25;
    ampAlpha += (ampAlphaTarget - ampAlpha) * 0.15;

    // 频率微扰：alpha 在 9-12Hz 间缓慢变化
    const freqAlpha = 10.5 + Math.sin(x * 0.003) * 1.5;
    const freqBeta = 22 + Math.sin(x * 0.007 + 1.7) * 3;
    const freqTheta = 5.8 + Math.sin(x * 0.005) * 0.8;

    phaseAlpha += 2 * Math.PI * freqAlpha * dt;
    phaseBeta += 2 * Math.PI * freqBeta * dt;
    phaseTheta += 2 * Math.PI * freqTheta * dt;

    const alpha = Math.sin(phaseAlpha) * ampAlpha;
    const beta = Math.sin(phaseBeta) * 0.08;
    const theta = Math.sin(phaseTheta) * 0.10;

    // 基线漂移
    driftVal += gauss() * 0.005;
    driftVal *= 0.995; // 缓慢回归中心

    // 噪声
    const noise = gauss() * 0.25;

    // 上尖峰（正尖峰）—— 高斯脉冲，平滑连接基线
    const sp1Center = 140, sp1Amp = 0.70, sp1Sigma = 10;
    const sp1 = sp1Amp * Math.exp(-Math.pow(x - sp1Center, 2) / (2 * sp1Sigma * sp1Sigma));

    // 下尖峰（负尖峰）—— 高斯脉冲，平滑连接基线
    const sp2Center = 390, sp2Amp = 0.60, sp2Sigma = 9;
    const sp2 = -sp2Amp * Math.exp(-Math.pow(x - sp2Center, 2) / (2 * sp2Sigma * sp2Sigma));

    sig[x] = alpha + beta + theta + driftVal + noise + sp1 + sp2;
  }

  return sig;
}

export default function IntroAnimation({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState(0);
  const { t } = useLang();
  const pathRef = useRef<SVGPathElement>(null);
  const animating = useRef(false);

  const [pathD] = useState(() => {
    const sig = generateEeg(42, 560);
    const c = 30, a = 13;
    const pts: string[] = [];
    for (let i = 0; i < sig.length; i++) {
      const x = i;
      const y = c + sig[i] * a;
      pts.push(i === 0 ? `M${x},${y.toFixed(2)}` : `L${x},${y.toFixed(2)}`);
    }
    return pts.join("");
  });

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 300);
    const t2 = setTimeout(() => setPhase(2), 700);
    const t3 = setTimeout(() => setPhase(3), 1200);
    const t4 = setTimeout(() => onComplete(), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onComplete]);

  useEffect(() => {
    if (phase < 1 || !pathRef.current || animating.current) return;

    const path = pathRef.current;
    const length = path.getTotalLength();
    if (length === 0) return;

    animating.current = true;
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;

    const duration = 800; // 更快
    const start = performance.now();

    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      path.style.strokeDashoffset = `${length * (1 - eased)}`;
      if (p < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [phase]);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center pointer-events-none" style={{ background: "#0a0e1a" }}>
      <div
        className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center bg-[#0f172a]"
        style={{ opacity: phase >= 1 ? 1 : 0, transform: phase >= 1 ? "scale(1)" : "scale(0.85) translateY(8px)", transition: "all 0.7s cubic-bezier(0.16,1,0.3,1)" }}
      >
        <img src="/neuroaccess-logo.png" alt="NeuroAccess" className="w-full h-full object-cover" />
      </div>

      <h1 className="mt-5 text-2xl font-bold tracking-tight text-[#e5e7eb]"
        style={{ opacity: phase >= 1 ? 1 : 0, transform: phase >= 1 ? "translateY(0)" : "translateY(8px)", transition: "all 0.5s 0.1s cubic-bezier(0.16,1,0.3,1)" }}>NeuroAccess</h1>

      <p className="mt-1 text-xs tracking-[0.2em] uppercase text-[#6b7280]"
        style={{ opacity: phase >= 2 ? 1 : 0, transition: "opacity 0.5s 0.2s ease-out" }}>{t("eegAnalysisPlatformSubtitle")}</p>

      <div className="mt-10 w-full max-w-lg px-6"
        style={{ opacity: phase >= 1 ? 1 : 0, transition: "opacity 0.3s ease-out" }}>
        <svg viewBox="0 0 560 60" className="w-full" style={{ display: "block" }}>
          <defs>
            <linearGradient id="eeg-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#06b6d4"/>
              <stop offset="60%" stopColor="#3b82f6"/>
              <stop offset="100%" stopColor="#8b5cf6"/>
            </linearGradient>
          </defs>
          <path
            ref={pathRef}
            d={pathD}
            fill="none"
            stroke="url(#eeg-grad)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="mt-4 flex items-center gap-2"
        style={{ opacity: phase >= 3 ? 1 : 0, transition: "opacity 0.4s 0.3s ease-out" }}>
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        <span className="text-sm text-slate-400">{t("ready")}</span>
      </div>
    </div>
  );
}
