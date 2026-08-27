// 前端波形 SVG 生成器（与后端 gen_waveform_svg 相同逻辑）
// 用途：当报告未同步到服务器（/api/waveform-image 返回 Report not found）时，
// 直接用本地 analysis 数据渲染波形图，保证波形图始终可见。
//
// 展示方式：每个通道一条原始波形曲线，所有通道统一颜色。

function esc(s: unknown): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** 渲染通道波形（waveform_preview），所有通道统一颜色。
 *  分页渲染（对齐 EDFbrowser/MNE 标准）：固定 10 秒/屏 + 固定时间尺度，page 指定第几页（0-based）。
 */
export function buildWaveformSvg(analysis: any, page = 0): string {
  const wp = analysis?.waveform_preview;
  const chs0 = wp?.channels || {};
  // 清理 EDF 填充的尾随空白/点（Fc5. → Fc5），并与后端一致重建通道 dict
  const cleanKey = (k: string) => k.trim().replace(/\.+$/, "").trim() || k;
  const chs: Record<string, number[]> = {};
  for (const k of Object.keys(chs0)) chs[cleanKey(k)] = chs0[k];
  const chNames = Object.keys(chs);
  if (chNames.length === 0) return "";
  const nch = chNames.length;
  const rawNpts = chs[chNames[0]]?.length || 0;
  if (rawNpts < 2) return "";

  const timesAll: number[] = wp?.times || [];
  let fs = parseFloat(wp?.sampling_rate || 128) || 128;
  if (timesAll.length > 1) {
    const dt = timesAll[1] - timesAll[0];
    if (dt > 0 && dt < 1) fs = 1 / dt;
  }

  // ── 分页：每屏秒数自适应（短文件≤30s 整段显示，横向更长不挤；长文件每屏 10s 翻页）──
  const PAGE_SECONDS = 10;
  const PX_PER_SEC = 100;
  const t0Total = timesAll.length > 1 ? timesAll[0] : 0;
  // 总时长优先用 waveform_preview.duration_seconds（真实全时长，本地存储可删 times 节省体积），
  // 回退用 times 轴或 样本数/采样率 估算。
  const durFromWp = parseFloat(wp?.duration_seconds || 0) || 0;
  const durTotal = durFromWp > 0
    ? durFromWp
    : (timesAll.length > 1 ? Math.max(timesAll[timesAll.length - 1] - t0Total, 1e-9) : Math.max(rawNpts / fs, 1e-9));
  const pageSeconds = durTotal <= 30 ? durTotal : PAGE_SECONDS;
  const totalPages = Math.max(1, Math.ceil(durTotal / pageSeconds));
  const curPage = Math.max(0, Math.min(Math.floor(page), totalPages - 1));
  const tStart = t0Total + curPage * pageSeconds;
  const tEnd = Math.min(t0Total + durTotal, tStart + pageSeconds);
  const winDur = Math.max(tEnd - tStart, 1e-9);

  // 裁剪当前窗口的数据：有 times 轴按时间索引；无 times（本地精简存储，channels 已降采样、
  // 点数与采样率不匹配）按"总点数 / 总页数"均分，避免按秒×采样率算出超界的空窗口
  let iStart: number, iEnd: number;
  if (timesAll.length > 1) {
    iStart = _findIdx(timesAll, tStart);
    iEnd = Math.min(rawNpts, _findIdx(timesAll, tEnd) + 1);
  } else {
    const pageSamples = Math.max(1, Math.ceil(rawNpts / totalPages));
    iStart = Math.min(rawNpts, curPage * pageSamples);
    iEnd = Math.min(rawNpts, iStart + pageSamples);
  }
  const winTimes = timesAll.slice(iStart, Math.max(iStart + 1, iEnd));
  const winChs: Record<string, number[]> = {};
  for (const nm of chNames) winChs[nm] = chs[nm].slice(iStart, Math.max(iStart + 1, iEnd));

  // 不做低通平滑：保留原始高频成分，波形有真实 EEG 的噪声底和复杂形态
  // 去基线漂移窗口：2 秒（移动平均），只去除极慢的基线摆动，保留真实低频（慢波/θ 等）
  const detK = Math.max(2, Math.round(fs * 2));
  // 去漂移：减去 0.5 秒移动平均（保持各通道基线稳定在中心）
  if (detK > 1 && winChs[chNames[0]]?.length > detK + 2) {
    for (const nm of chNames) {
      const v = winChs[nm];
      if (!v || v.length <= detK + 2) continue;
      const out = new Array(v.length);
      const half = Math.floor(detK / 2);
      for (let i = 0; i < v.length; i++) {
        let s = 0, n = 0;
        for (let k = -half; k <= half; k++) {
          const j = i + k;
          if (j >= 0 && j < v.length) { s += v[j]; n++; }
        }
        out[i] = v[i] - (n ? s / n : 0);
      }
      winChs[nm] = out;
    }
  }

  // 不降采样：像素列粒度渲染直接用窗口原始数据（每列取 min/max）

  const LW = 65;
  const t0 = winTimes.length > 1 ? winTimes[0] : tStart;
  const dur = winTimes.length > 1 ? Math.max(winTimes[winTimes.length - 1] - t0, 1e-9) : winDur;
  // 统一绘图宽度：所有时长文件波形一致铺满显示区域。
  // 以前 PLOT_W = min(1400, pageSeconds*100) 会让 8 秒文件只有 800px 宽，
  // 波形偏窄、占不满区域；统一固定宽度后，短文件波形自动横向拉伸铺满。
  const PLOT_W = 1300;
  const W = LW + PLOT_W + 15;
  const laneH = 34;  // 固定通道高度（标准做法），多通道整图变高纵向滚动
  const H = laneH * nch + 30;

  const svg: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="background:#1a1a2e;font-family:monospace">`,
  ];

  // 朴素直接渲染：每个横向像素列取列内中位值（仅性能降采样，忠实反映数据）
  const LINE_COLOR = "#38bdf8";
  const renderValsFor = (nm: string): number[] => winChs[nm] as number[];
  const nvRef = renderValsFor(chNames[0]).length;
  if (nvRef < 2) return "";
  // 列数不能超过当前窗口实际数据点数，否则大量列重复同一点 → 水平线/大斜线
  const COLS = Math.max(2, Math.min(Math.min(PLOT_W, 1200), nvRef));
  // 全局振幅基准：所有通道合并 p90，所有通道共用同一缩放（保留真实振幅差异）
  const allAbs: number[] = [];
  for (const nm of chNames) { const vv = renderValsFor(nm); for (const v of vv) allAbs.push(Math.abs(v)); }
  allAbs.sort((a, b) => a - b);
  const GLOBAL_REF = allAbs[Math.min(Math.round(allAbs.length * 0.9), allAbs.length - 1)] || 1;
  const scBase = (laneH * 0.5) / GLOBAL_REF;
  // 波形完全如实显示，不压缩；超出通道的伪影由 clipPath 自然裁掉（真实削波）
  // 每通道 clipPath：大尖峰超出 lane 被如实削顶（不溢出相邻通道）
  svg.push("<defs>");
  for (let ci = 0; ci < nch; ci++) svg.push(`<clipPath id="c${ci}"><rect x="0" y="${ci * laneH}" width="${W}" height="${laneH}"/></clipPath>`);
  svg.push("</defs>");
  for (let i = 0; i < nch; i++) {
    const ch = chNames[i];
    const y = i * laneH + laneH / 2;
    svg.push(
      `<line x1="${LW}" y1="${y}" x2="${W}" y2="${y}" stroke="#333" stroke-width="0.5" stroke-dasharray="3 3"/>`
    );
    svg.push(
      `<text x="${LW - 4}" y="${y + 3}" fill="#aab" font-size="${Math.min(11, Math.max(8, Math.round(200 / nch)))}" text-anchor="end">${esc(ch)}</text>`
    );
    const vals = renderValsFor(ch);
    if (!vals || vals.length < 2) continue;
    const sc = scBase;  // 全局统一缩放（保留真实振幅差异）
    // 每像素列取一个代表点：选列内"偏离基线最远"的样本（保留尖峰方向与幅度），
    // 按时间顺序连成真实波形线（不再画 min/max 竖直包络，避免假"填充块"观感）。
    const nv = vals.length;
    const step = nv / COLS;
    const xs: number[] = [], ys: number[] = [];
    for (let j = 0; j < COLS; j++) {
      const s = Math.floor(j * step);
      const e = Math.min(Math.floor((j + 1) * step), nv);
      if (e <= s) continue;
      // 列内基线（中位）作为参考，取偏离最大的点（保留正负尖峰）
      let base = vals[s];
      const m = (s + e) >> 1;
      base = vals[m];
      let best = s, bestAbs = -1;
      for (let k = s; k < e; k++) {
        const a = Math.abs(vals[k] - base);
        if (a > bestAbs) { bestAbs = a; best = k; }
      }
      const x = LW + (j + 0.5) / COLS * PLOT_W;
      xs.push(x);
      ys.push(vals[best]);
    }
    // 真实波形线：按时间顺序连接代表点（尖峰如实保留，呈现真实 EEG 形态）
    if (xs.length > 1) {
      let d = `M${xs[0].toFixed(1)},${(y - ys[0] * sc).toFixed(2)}`;
      for (let j = 1; j < xs.length; j++) d += ` L${xs[j].toFixed(1)},${(y - ys[j] * sc).toFixed(2)}`;
      svg.push(`<path d="${d}" stroke="${LINE_COLOR}" stroke-width="1.0" fill="none" opacity="0.9" clip-path="url(#c${i})"/>`);
    }
  }

  // 底部时间条背景
  svg.push(`<rect x="0" y="${H - 22}" width="${W}" height="22" fill="#14142e"/>`);
  // 时间刻度：每 2 秒一个，带浅色垂直参考线，窗口绝对时间
  const tickStep = 2;
  let k = 0;
  while (true) {
    const t = tStart + k * tickStep;
    if (t > tEnd + 1e-9) break;
    const x = LW + (k * tickStep / winDur) * PLOT_W;
    if (k > 0) svg.push(`<line x1="${x.toFixed(1)}" y1="0" x2="${x.toFixed(1)}" y2="${H - 22}" stroke="#2a2a4e" stroke-width="0.5" stroke-dasharray="1 4" opacity="0.6"/>`);
    svg.push(`<text x="${x.toFixed(1)}" y="${H - 7}" fill="#9aa" font-size="11" text-anchor="middle">${(t - t0Total).toFixed(0)}s</text>`);
    k++;
  }
  svg.push("</svg>");
  return svg.join("");
}

/** 二分查找最后一个时间 <= t 的索引 */
function _findIdx(times: number[], t: number): number {
  let lo = 0, hi = times.length - 1;
  if (t <= times[0]) return 0;
  if (t >= times[hi]) return hi;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (times[mid] <= t) lo = mid; else hi = mid - 1;
  }
  return lo;
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
