// 前端波形 SVG 生成器（与后端 gen_waveform_svg 相同逻辑）
// 用途：当报告未同步到服务器（/api/waveform-image 返回 Report not found）时，
// 直接用本地 analysis.waveform_preview 数据渲染波形图，保证波形图始终可见。

import { fft, nextPow2 } from "@/lib/band-waveform-generator";

const BAND_COLORS: Record<string, string> = {
  delta: "#ef4444", alpha: "#3b82f6",
  theta: "#facc15", beta: "#22c55e", gamma: "#a855f7",
};
const BAND_RANGES: Record<string, [number, number]> = {
  delta: [0.5, 4], theta: [4, 8], alpha: [8, 13],
  beta: [13, 30], gamma: [30, 100],
};

function dominantBand(vals: number[], fs: number): string {
  const n = vals.length;
  if (n < 64 || fs <= 0) return "delta";
  let mean = 0;
  for (let i = 0; i < n; i++) mean += vals[i];
  mean /= n;
  const fftN = nextPow2(n);
  const re = new Float64Array(fftN);
  const im = new Float64Array(fftN);
  for (let i = 0; i < n; i++) re[i] = vals[i] - mean;
  fft(re, im);
  const freqRes = fs / fftN;
  const nyqBin = Math.floor(fftN / 2);
  let bestName = "delta";
  let bestPower = -1;
  for (const name of Object.keys(BAND_RANGES)) {
    const [lo, hi] = BAND_RANGES[name];
    const loBin = Math.max(1, Math.round(lo / freqRes));
    const hiBin = Math.min(nyqBin, Math.round(hi / freqRes));
    if (hiBin < loBin) continue;
    let power = 0;
    let nBins = 0;
    for (let k = loBin; k <= hiBin; k++) {
      power += re[k] * re[k] + im[k] * im[k];
      nBins += 1;
    }
    const meanPower = nBins > 0 ? power / nBins : 0;
    if (meanPower > bestPower) {
      bestPower = meanPower;
      bestName = name;
    }
  }
  return bestName;
}

function esc(s: unknown): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function buildWaveformSvg(wp: any): string {
  const chs = wp?.channels || {};
  const chNames = Object.keys(chs);
  if (chNames.length === 0) return "";
  const nch = chNames.length;
  const npts = chs[chNames[0]]?.length || 0;
  if (npts < 2) return "";

  const times: number[] = wp?.times || [];
  let fs = parseFloat(wp?.sampling_rate || 128) || 128;
  if (times.length > 1) {
    const dt = times[1] - times[0];
    if (dt > 0 && dt < 1) fs = 1 / dt;
  }

  const LW = 65;
  const PLOT_W = 835;
  const t0 = times.length > 1 ? times[0] : 0;
  const dur = times.length > 1 ? Math.max(times[times.length - 1] - t0, 1e-9) : Math.max(npts / fs, 1e-9);
  const W = LW + PLOT_W + 15;
  const laneH = Math.max(4, Math.min(24, Math.round(520 / nch)));
  const H = laneH * nch + 30;

  const svg: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="background:#1a1a2e;font-family:monospace">`,
  ];

  for (let i = 0; i < nch; i++) {
    const ch = chNames[i];
    const y = i * laneH + laneH / 2;
    svg.push(
      `<line x1="${LW}" y1="${y}" x2="${W}" y2="${y}" stroke="#333" stroke-width="0.5" stroke-dasharray="3 3"/>`
    );
    svg.push(
      `<text x="${LW - 4}" y="${y + 3}" fill="#aab" font-size="${Math.min(11, Math.max(8, Math.round(200 / nch)))}" text-anchor="end">${esc(ch)}</text>`
    );
    const vals = chs[ch] as number[];
    if (vals.length < 2) continue;
    const vabs = vals.map((v) => Math.abs(v)).sort((a, b) => a - b);
    const p95 = vabs[Math.min(Math.round(vabs.length * 0.95), vabs.length - 1)] || 1;
    const sc = (laneH * 0.5) / (2 * p95);
    const cl = laneH * 0.5 / sc;
    let pts = "M";
    if (times.length === vals.length) {
      for (let j = 0; j < vals.length; j++) {
        const x = LW + ((times[j] - t0) / dur) * PLOT_W;
        const vy = y - Math.max(-cl, Math.min(cl, vals[j])) * sc;
        pts += ` ${x.toFixed(1)},${vy.toFixed(2)}`;
      }
    } else {
      for (let j = 0; j < vals.length; j++) {
        const x = LW + (j / (npts - 1)) * PLOT_W;
        const vy = y - Math.max(-cl, Math.min(cl, vals[j])) * sc;
        pts += ` ${x.toFixed(1)},${vy.toFixed(2)}`;
      }
    }
    const band = dominantBand(vals, fs);
    svg.push(
      `<path d="${pts}" stroke="${BAND_COLORS[band] || "#ef4444"}" stroke-width="0.7" fill="none" opacity="0.85"/>`
    );
  }

  for (let i = 0; i < 6; i++) {
    const t = (i * dur) / 5;
    const x = LW + (i / 5) * PLOT_W;
    svg.push(
      `<text x="${x.toFixed(1)}" y="${H - 4}" fill="#667" font-size="9" text-anchor="middle">${t.toFixed(1)}s</text>`
    );
  }
  svg.push("</svg>");
  return svg.join("");
}

export function svgToDataUrl(svg: string): string {
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

/** 判断服务器返回的 SVG 是否为占位（报告未同步到服务器等） */
export function isPlaceholderSvg(svg: string): boolean {
  return (
    svg.includes("Report not found") ||
    svg.includes("No waveform data") ||
    svg.includes("Insufficient data points") ||
    svg.includes("Missing report ID") ||
    svg.includes(">Error:") ||
    svg.startsWith("<svg width=400 height=100>")
  );
}
