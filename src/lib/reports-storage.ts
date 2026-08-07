const STORAGE_KEY = "neuroaccess-reports";
const STORAGE_WARN_THRESHOLD = 0.85; // 85% of quota

export interface StoredReport {
  id: string;
  fileName: string;
  date: string;
  mode: "Beginner" | "Student" | "Research";
  quality: number;
  language?: string; // 分析时的语言
  analysis: Record<string, unknown>;
  eegData?: any; // EEG 波形数据（前 N 秒降采样），用于报告详情页直接显示波形
}

// 存储满回调
let _onStorageFull: (() => void) | null = null;
export function onStorageFull(cb: () => void) {
  _onStorageFull = cb;
}

// 估算 localStorage 使用率
function checkStorageQuota(): boolean {
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const val = localStorage.getItem(key);
        if (val) total += key.length + val.length;
      }
    }
    // 典型 localStorage 限制为 5MB (5,242,880 bytes)
    const usage = total / 5_242_880;
    if (usage >= STORAGE_WARN_THRESHOLD && _onStorageFull) {
      _onStorageFull();
    }
    return usage < 1.0;
  } catch {
    return false;
  }
}

/** 从 localStorage 读取所有报告（不包含 eegData 波形以减小体积） */
export function loadReports(): StoredReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as StoredReport[];
  } catch {
    return [];
  }
}

/** 缓存，避免重复 parse */
let _cache: StoredReport[] | null = null;
function getCached(): StoredReport[] {
  if (_cache) return _cache;
  _cache = loadReports();
  return _cache;
}
function invalidate() {
  _cache = null;
}

/** 保存整组报告到 localStorage */
export function saveReports(reports: StoredReport[]): void {
  try {
    _cache = reports;
    const serialized = JSON.stringify(reports);
    // 检查存储空间：超过 4MB 时尝试压缩
    // 说明：eegData 已在 analysis-context 中降采样到 500 点/通道
    // waveform_preview 的 times/channels 与 eegData 冗余，可安全删除
    if (serialized.length > 4_000_000) {
      const trimmed = reports.slice(0, 50).map(r => {
        // 保留 eegData（波形图需要），删除 analysis.waveform_preview 中的时间序列（与 eegData 冗余）
        let wp: any = undefined;
        const rawWp = (r.analysis as any)?.waveform_preview;
        if (rawWp) {
          wp = { ...rawWp, times: undefined, channels: undefined };
        }
        return { ...r, analysis: r.analysis ? { ...r.analysis, band_waveforms: undefined, waveform_preview: wp } : r.analysis };
      });
      _cache = trimmed as unknown as StoredReport[];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } else {
      localStorage.setItem(STORAGE_KEY, serialized);
    }
  } catch {
    // 存储失败：更激进压缩
    try {
      const stripped = reports.slice(0, 20).map(r => ({
        ...r, eegData: undefined,
        analysis: r.analysis ? {
          signal_quality_score: (r.analysis as any).signal_quality_score,
          overview: (r.analysis as any).overview,
          frequency_analysis: (r.analysis as any).frequency_analysis,
          duration: (r.analysis as any).duration,
          sampling_rate: (r.analysis as any).sampling_rate,
          channel_count: (r.analysis as any).channel_count,
          file_name: (r.analysis as any).file_name,
          noisy_channels: (r.analysis as any).noisy_channels,
          possible_artifacts: (r.analysis as any).possible_artifacts,
          quality_details: (r.analysis as any).quality_details,
        } : undefined,
      }));
      _cache = stripped as unknown as StoredReport[];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped));
    } catch {
      try {
        const minimal = reports.slice(0, 5).map(r => ({
          ...r, eegData: undefined,
          analysis: r.analysis ? {
            signal_quality_score: (r.analysis as any).signal_quality_score,
            duration: (r.analysis as any).duration,
            sampling_rate: (r.analysis as any).sampling_rate,
            channel_count: (r.analysis as any).channel_count,
          } : undefined,
        }));
        _cache = minimal as unknown as StoredReport[];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal));
      } catch {
        _cache = [];
      }
    }
  }
}

/** 新增一条报告（每次从 localStorage 读取最新，避免竞态条件） */
export function addReport(report: StoredReport): void {
  invalidate(); // 清除缓存，确保下次读取最新数据
  const reports = loadReports(); // 每次都从 localStorage 读取，不用缓存
  // 如果已存在相同 id，替换
  const idx = reports.findIndex((r) => r.id === report.id);
  if (idx >= 0) {
    reports[idx] = report;
  } else {
    reports.unshift(report); // 最新的在前面
  }
  saveReports(reports);
}

/** 删除一条报告 */
export function deleteReport(id: string): void {
  const reports = getCached();
  saveReports(reports.filter((r) => r.id !== id));
}

/** 根据 ID 获取单条报告 */
export function getReportById(id: string): StoredReport | null {
  const reports = getCached();
  return reports.find((r) => r.id === id) || null;
}

/** 跨标签页同步时清除缓存 */
export function clearReportsCache() {
  invalidate();
}

/** 清空所有报告 */
export function clearAllReports(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// ── 服务端报告同步（跨设备） ───────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("neuroaccess-token") || "";
}

async function apiPost(path: string, body: any): Promise<any> {
  try {
    const resp = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    return await resp.json();
  } catch {
    return { success: false };
  }
}

async function apiGet(path: string): Promise<any> {
  try {
    const resp = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return await resp.json();
  } catch {
    return { success: false };
  }
}

/** 同步报告到服务端（保存后调用） */
export async function syncReportToServer(report: StoredReport): Promise<boolean> {
  if (!getToken()) return false;
  const result = await apiPost("/api/reports/save", report);
  return result.success === true;
}

/** 从服务端拉取所有报告 */
export async function fetchServerReports(): Promise<StoredReport[] | null> {
  if (!getToken()) return null;
  const result = await apiGet("/api/reports/list");
  if (!result.success) return null;
  return result.reports || [];
}

/** 从服务端获取单条报告完整数据 */
export async function fetchServerReport(id: string): Promise<any> {
  if (!getToken()) return null;
  const result = await apiPost("/api/reports/get", { id });
  return result?.success ? result.report : null;
}

/** 删除服务端报告 */
export async function deleteServerReport(id: string): Promise<boolean> {
  if (!getToken()) return false;
  const result = await apiPost("/api/reports/delete", { id });
  return result.success === true;
}

/** 删除服务端全部报告 */
export async function clearServerReports(): Promise<boolean> {
  if (!getToken()) return false;
  const result = await apiPost("/api/reports/delete-all", {});
  return result.success === true;
}

// ── 收藏功能（localStorage）────────────────────────────────
const FAVORITES_KEY = "neuroaccess-favorites";

export function getFavorites(): string[] {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(FAVORITES_KEY) : null;
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function isFavorite(reportId: string): boolean {
  return getFavorites().includes(reportId);
}

export function toggleFavorite(reportId: string): boolean {
  const list = getFavorites();
  const next = list.includes(reportId) ? list.filter((x) => x !== reportId) : [...list, reportId];
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(next)); } catch {}
  return next.includes(reportId);
}
