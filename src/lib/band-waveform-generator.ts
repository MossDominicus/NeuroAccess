/**
 * 前端频段波形生成器
 *
 * 当存储的报告中没有 band_waveforms（旧报告）时，
 * 从原始通道数据（eegData.times + eegData.channels）计算
 * Delta/Theta/Alpha/Beta 四种频段波形。
 *
 * 算法：FFT → 频域带通 → IFFT
 */

// ── FFT（Cooley-Tukey radix-2，原地修改）────────────────────────
function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  if (n <= 1) return;

  // 位反转
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }

  // 迭代 FFT
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = -Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1, curIm = 0;
      const half = len >> 1;
      for (let j = 0; j < half; j++) {
        const idxA = i + j;
        const idxB = i + j + half;
        const tRe = curRe * re[idxB] - curIm * im[idxB];
        const tIm = curRe * im[idxB] + curIm * re[idxB];
        re[idxB] = re[idxA] - tRe;
        im[idxB] = im[idxA] - tIm;
        re[idxA] += tRe;
        im[idxA] += tIm;
        const newRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = newRe;
      }
    }
  }
}

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

// ── 频段定义 ──────────────────────────────────────────────────
const BANDS: { name: string; low: number; high: number }[] = [
  { name: "delta", low: 0.5, high: 4 },
  { name: "theta", low: 4, high: 8 },
  { name: "alpha", low: 8, high: 13 },
  { name: "beta",  low: 13, high: 30 },
];

/**
 * 从原始通道数据计算频段波形
 *
 * @returns null 如果没有足够的通道数据
 */
export function computeBandWaveforms(
  times: number[],
  channels: Record<string, number[]>,
  samplingRate: number,
): { times: number[]; delta: number[]; theta: number[]; alpha: number[]; beta: number[] } | null {
  const chNames = Object.keys(channels);
  if (chNames.length === 0 || times.length < 50 || samplingRate <= 0) return null;

  const nSamples = times.length;

  // 1. 平均所有通道
  const avgSignal = new Float64Array(nSamples);
  for (let i = 0; i < nSamples; i++) {
    let sum = 0;
    for (const ch of chNames) {
      sum += channels[ch]?.[i] ?? 0;
    }
    avgSignal[i] = sum / chNames.length;
  }

  // 2. 去直流偏置
  let mean = 0;
  for (let i = 0; i < nSamples; i++) mean += avgSignal[i];
  mean /= nSamples;
  for (let i = 0; i < nSamples; i++) avgSignal[i] -= mean;

  // 3. FFT（pad 到下一个 2 的幂）
  const fftN = nextPow2(nSamples);
  const re = new Float64Array(fftN);
  const im = new Float64Array(fftN);
  for (let i = 0; i < nSamples; i++) re[i] = avgSignal[i];
  // 剩余自动为 0

  fft(re, im);

  // 频率分辨率
  const freqRes = samplingRate / fftN;

  // 4. 对每个频段做带通 IFFT
  const result: Record<string, number[]> = { delta: [], theta: [], alpha: [], beta: [] };

  for (const band of BANDS) {
    // 复制 FFT 结果
    const reBand = new Float64Array(re);
    const imBand = new Float64Array(im);

    // 清零频段外的所有频率分量
    const lowBin = Math.max(1, Math.round(band.low / freqRes)); // 跳过 DC (bin 0)
    const highBin = Math.min(fftN - 1, Math.round(band.high / freqRes));

    for (let k = 0; k < fftN; k++) {
      if (k < lowBin || k > highBin) {
        reBand[k] = 0;
        imBand[k] = 0;
      }
    }
    // 对称部分也要清（正负频率）
    for (let k = fftN - lowBin; k < fftN; k++) {
      reBand[k] = 0;
      imBand[k] = 0;
    }

    // IFFT
    // 对于 IFFT，用 FFT 的共轭再除以 N
    // 复共轭
    for (let k = 0; k < fftN; k++) imBand[k] = -imBand[k];
    fft(reBand, imBand);
    // 除以 N 并取实部
    const bandSignal = new Float64Array(fftN);
    for (let i = 0; i < fftN; i++) {
      bandSignal[i] = reBand[i] / fftN;
    }

    // 提取原始长度
    const extracted: number[] = [];
    for (let i = 0; i < nSamples; i++) extracted.push(bandSignal[i]);
    result[band.name] = extracted;
  }

  return {
    times,
    delta: result.delta,
    theta: result.theta,
    alpha: result.alpha,
    beta: result.beta,
  };
}

/**
 * 逐通道计算"每个通道的主导频段"，统计每个频段拥有多少个通道。
 * 图例显示的是通道数量（不是百分比）：Delta (N) 表示 N 个通道以 delta 为主。
 * 对每个通道做去直流 + FFT，比较四个频段的总功率，取最大者为该通道主导频段。
 */
export function computeBandDominantCounts(
  channels: Record<string, number[]>,
  samplingRate: number,
  times?: number[],
): { delta: number; theta: number; alpha: number; beta: number } | null {
  const chNames = Object.keys(channels);
  if (chNames.length === 0 || samplingRate <= 0) return null;
  // 后端对波形做过 step 降采样，直接用原始采样率算频轴会把频率读高（如 250Hz→step3 后真实≈83Hz）。
  // 优先用 times 数组推真实采样间隔，拿不到再退回 samplingRate。
  let fs = samplingRate;
  if (times && times.length > 1) {
    const dt = times[1] - times[0];
    if (dt > 0 && dt < 1) fs = 1 / dt;
  }
  const counts: { delta: number; theta: number; alpha: number; beta: number } = { delta: 0, theta: 0, alpha: 0, beta: 0 };
  for (const ch of chNames) {
    const data = channels[ch];
    if (!data || data.length < 64) continue;
    const n = data.length;
    const fftN = nextPow2(n);
    const re = new Float64Array(fftN);
    const im = new Float64Array(fftN);
    // 去直流偏置
    let mean = 0;
    for (let i = 0; i < n; i++) mean += data[i];
    mean /= n;
    for (let i = 0; i < n; i++) re[i] = data[i] - mean;
    fft(re, im);
    const freqRes = fs / fftN;
    let bestPower = -1;
    let bestName: string = "delta";
    for (const band of BANDS) {
      const lo = Math.max(1, Math.round(band.low / freqRes));
      const hi = Math.min(fftN - 1, Math.round(band.high / freqRes));
      // 用"每bin平均功率"而不是"总累加"，避免宽频段（beta ~17 bin）天然赢过窄频段（delta ~3 bin）
      let power = 0;
      let nBins = 0;
      for (let k = lo; k <= hi; k++) {
        power += re[k] * re[k] + im[k] * im[k];
        nBins += 1;
      }
      const meanPower = nBins > 0 ? power / nBins : 0;
      if (meanPower > bestPower) {
        bestPower = meanPower;
        bestName = band.name;
      }
    }
    if (bestName in counts) counts[bestName as keyof typeof counts] += 1;
  }
  return counts;
}
