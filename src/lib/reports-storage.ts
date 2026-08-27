// 注意：不要再用 bump STORAGE_KEY 的方式强制刷新波形——这会把用户本地报告全部清空（即使服务器有备份），
// 且若用户离线/未登录，报告会彻底"消失"。波形渲染问题改用 per-report wpSchema 重算解决（见 buildWaveformSvg 兼容逻辑）。
const STORAGE_KEY_BASE = "neuroaccess-reports";
const STORAGE_WARN_THRESHOLD = 0.85; // 85% of quota

// ── 用户级作用域 ──────────────────────────────────────
// 本地报告/收藏/已删记录必须按用户隔离：同一设备上切换账号登录时，
// 绝不能把上一个账号的本地缓存显示给当前用户（曾导致"登录后看到上一个账号的旧报告"）。
// 未登录（游客）时回退到不带用户后缀的旧 key。
function currentUserId(): string {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem("neuroaccess-user") : null;
    if (raw) {
      const u = JSON.parse(raw);
      if (u && u.id != null) return String(u.id);
    }
  } catch {}
  return "";
}
function scopedKey(base: string): string {
  const uid = currentUserId();
  return uid ? `${base}:${uid}` : base;
}
const getReportsKey = () => scopedKey(STORAGE_KEY_BASE);
const getFavoritesKey = () => scopedKey("neuroaccess-favorites");
const getDeletedKey = () => scopedKey("neuroaccess-deleted-reports");

export interface StoredReport {
  id: string;
  fileName: string;
  date: string;
  mode: "Beginner" | "Student" | "Research";
  quality: number;
  language?: string; // 分析时的语言
  analysis: Record<string, unknown>;
  eegData?: any; // EEG 波形数据（前 N 秒降采样），用于报告详情页直接显示波形
  hasEegData?: boolean; // 列表摘要中标记该报告是否含 EEG 波形数据（大字段不入列）
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
    const raw = localStorage.getItem(getReportsKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as StoredReport[];
  } catch {
    return [];
  }
}

/** 读取旧版无用户后缀 key 下的报告（游客分析 / 旧版本遗留数据）。
 *  仅在当前用户尚无本地报告时作为"待推送候选"参与对账，不会直接展示给当前用户。 */
export function loadLegacyReports(): StoredReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BASE);
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

/** 对 waveform_preview 做降采样，保证本地始终存得下、波形图本地即可渲染。
 *  channels 每通道最多 MAX_WP_PTS 点（保留真实幅值），保留 duration_seconds（分页/时长用）、
 *  sampling_rate、channel_names，丢弃冗余的 times（分页用 duration_seconds 推算）。
 */
// 本地波形降采样点数：10000 点/通道足够让每页窗口有 ~500 点，波形真实自然，
// 体积约 1.2MB/份，本地可直接渲染、零延迟。超限时只保留最近报告的波形。
const MAX_WP_PTS = 4000;
// 波形格式版本：旧版（无标记）是 min/max 成对数据，渲染出来是假"填充块"，必须重算。
// 任何经过 _downsampleWp 重算的波形都打上此标记，渲染端据此判断是否需要从服务器取新波形。
const WP_SCHEMA = 2;
function _downsampleWp(rawWp: any): any {
  if (!rawWp) return undefined;
  const chs = rawWp.channels || {};
  const names = Object.keys(chs);
  if (!names.length) return { ...rawWp, times: undefined, wpSchema: WP_SCHEMA };
  const n = chs[names[0]].length || 0;
  if (n <= MAX_WP_PTS) return { ...rawWp, times: undefined, wpSchema: WP_SCHEMA };
  // 每段取一个"偏离段中点最远"的点（保留尖峰方向与幅度），点数为 MAX_WP_PTS，
  // 不翻倍、不抹平；渲染端再按像素列取极值，波形真实且体积可控。
  const step = n / MAX_WP_PTS;
  const outChs: Record<string, number[]> = {};
  for (const nm of names) {
    const v = chs[nm];
    const o: number[] = new Array(MAX_WP_PTS);
    for (let i = 0; i < MAX_WP_PTS; i++) {
      const s = Math.floor(i * step);
      const e = Math.min(n, Math.floor((i + 1) * step));
      if (e <= s) { o[i] = v[Math.min(s, n - 1)] ?? 0; continue; }
      const mid = (s + e) >> 1;
      const base = v[mid];
      let best = s, bestAbs = -1;
      for (let k = s; k < e; k++) {
        const a = Math.abs(v[k] - base);
        if (a > bestAbs) { bestAbs = a; best = k; }
      }
      o[i] = v[best];
    }
    outChs[nm] = o;
  }
  return { ...rawWp, channels: outChs, times: undefined, wpSchema: WP_SCHEMA };
}

// 本地存储预算（字节）。localStorage 典型上限 5MB，波形按体积预算裁剪：
// 优先保证所有报告元数据都在（列表/详情可读），波形只保留最近的、且总波形体积不超预算。
// 波形放不下的报告，详情页会从服务器拉取波形（已在 detail 页兜底），本地仍保留完整元数据。
const STORAGE_BUDGET = 3_500_000; // ~3.5MB，给其它数据留出空间

/** 按预算保存：所有报告保留元数据，波形按"最近优先 + 体积预算"裁剪。绝不把缓存清空。 */
export function saveReports(reports: StoredReport[]): void {
  const stripWp = (r: StoredReport, keepWp: boolean): StoredReport => {
    if (!r.analysis) return r;
    return {
      ...r,
      analysis: {
        ...r.analysis,
        band_waveforms: undefined,
        waveform_preview: keepWp ? _downsampleWp((r.analysis as any)?.waveform_preview) : undefined,
      },
    };
  };
  // 第一遍：全部保留（含波形），若放得下直接存
  try {
    const serialized = JSON.stringify(reports);
    if (serialized.length <= STORAGE_BUDGET) {
      _cache = reports;
      localStorage.setItem(getReportsKey(), serialized);
      return;
    }
  } catch { /* 超限或异常 → 走预算裁剪 */ }
  // 第二遍：预算裁剪——所有报告保留元数据，波形按最近优先放入直到塞满预算
  try {
    const out: StoredReport[] = [];
    const budgetLeft = () => {
      let s = 0;
      for (const r of out) s += JSON.stringify(r).length;
      return s;
    };
    for (let i = 0; i < reports.length; i++) {
      const r = reports[i];
      const withWp = stripWp(r, true);
      const withoutWp = stripWp(r, false);
      // 估算加当前项后的总体积（前面已定稿 + 当前项）
      const sizeWith = budgetLeft() + JSON.stringify(withWp).length;
      const sizeWithout = budgetLeft() + JSON.stringify(withoutWp).length;
      // 若带波形放得下就用带波形的；否则至少保留元数据
      out.push(sizeWith <= STORAGE_BUDGET ? withWp : withoutWp);
    }
    _cache = out as unknown as StoredReport[];
    localStorage.setItem(getReportsKey(), JSON.stringify(out));
    return;
  } catch { /* 仍在极端情况失败 → 保底只存元数据 */ }
  try {
    const metaOnly = reports.map(r => stripWp(r, false));
    _cache = metaOnly as unknown as StoredReport[];
    localStorage.setItem(getReportsKey(), JSON.stringify(metaOnly));
  } catch {
    _cache = [];
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

/** 清空当前用户的所有本地报告（连同旧版全局 key 一起清，避免遗留串号） */
export function clearAllReports(): void {
  try {
    localStorage.removeItem(getReportsKey());
  } catch {
    // ignore
  }
  try {
    localStorage.removeItem(STORAGE_KEY_BASE);
  } catch {
    // ignore
  }
}

/** 清空指定用户的本地报告/收藏/已删记录（删除账号、重新注册等场景）。
 *  userId 为空时清空游客（旧版全局）数据。 */
export function clearReportsForUser(userId: string | number | null | undefined): void {
  const uid = userId == null || userId === "" ? "" : String(userId);
  const rk = uid ? `${STORAGE_KEY_BASE}:${uid}` : STORAGE_KEY_BASE;
  const fk = uid ? `neuroaccess-favorites:${uid}` : "neuroaccess-favorites";
  const dk = uid ? `neuroaccess-deleted-reports:${uid}` : "neuroaccess-deleted-reports";
  try { localStorage.removeItem(rk); } catch {}
  try { localStorage.removeItem(fk); } catch {}
  try { localStorage.removeItem(dk); } catch {}
  // 同时清理旧版全局 key
  try { localStorage.removeItem(STORAGE_KEY_BASE); } catch {}
  try { localStorage.removeItem("neuroaccess-favorites"); } catch {}
  try { localStorage.removeItem("neuroaccess-deleted-reports"); } catch {}
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

// ── 收藏功能（按用户隔离）────────────────────────────────
export function getFavorites(): string[] {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(getFavoritesKey()) : null;
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveFavorites(list: string[]): void {
  try { localStorage.setItem(getFavoritesKey(), JSON.stringify(list)); } catch {}
}

export function isFavorite(reportId: string): boolean {
  return getFavorites().includes(reportId);
}

export function toggleFavorite(reportId: string): boolean {
  const list = getFavorites();
  const next = list.includes(reportId) ? list.filter((x) => x !== reportId) : [...list, reportId];
  saveFavorites(next);
  return next.includes(reportId);
}

// ── 已删除报告 id 记录（按用户隔离；防止服务器同步把已删报告拉回来） ─────
// 删除报告时本地记录其 id，永久保留（不再清除）——配合服务器删除墓碑，
// 确保已删报告不会被滞后快照/其它设备残留副本复活。
export function getDeletedIds(): Set<string> {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(getDeletedKey()) : null;
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function markDeleted(reportId: string): void {
  try {
    const ids = getDeletedIds();
    ids.add(reportId);
    localStorage.setItem(getDeletedKey(), JSON.stringify([...ids]));
  } catch {}
}

export type SyncResult = "ok" | "deleted" | "failed";

/** 推送到服务器，返回细分结果：ok=成功 / deleted=服务器墓碑拒绝 / failed=网络等其它失败 */
export async function syncReportToServerWithResult(report: StoredReport): Promise<SyncResult> {
  if (!getToken()) return "failed";
  const result = await apiPost("/api/reports/save", report);
  if (result.success === true) return "ok";
  if (result?.code === "report_deleted" || result?.error === "report_deleted") return "deleted";
  return "failed";
}

/** 解析报告时间（date 形如 "2026/8/21 15:37:43" 或 "2026-08-21 15:37:43"） */
function reportTimeMs(report: StoredReport): number {
  const d = report?.date;
  if (typeof d === "string" && d) {
    const m = d.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
    if (m) {
      const t = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)).getTime();
      if (!isNaN(t)) return t;
    }
  }
  return Number.MAX_SAFE_INTEGER; // 无法解析：保守保留，不丢弃
}

const RECENT_WINDOW_MS = 60 * 60 * 1000; // 1 小时

/**
 * 与服务器对账（服务器为多设备真相源）：
 * 1. 拉取服务器报告，排除本机已删 id；
 * 2. 本地有、服务器没有的报告：
 *    - 最近 1 小时内创建 → 刚分析成功（写入服务器可能因异常被吞）→ 尝试推送到服务器，失败则保留本地；
 *    - 超过 1 小时 → 只可能是已删残留/过期快照 → 直接丢弃；
 *    - 服务器墓碑明确拒绝 → 丢弃本地副本。
 * 返回 null 表示未登录或网络异常（此时保留本地缓存不改动）。
 */
export async function reconcileReportsWithServer(): Promise<StoredReport[] | null> {
  if (!getToken()) return null;
  const serverReports = await fetchServerReports();
  if (serverReports === null) return null;
  const deleted = getDeletedIds();
  const fresh = serverReports.filter((r: any) => !deleted.has(r.id));
  const serverIds = new Set(fresh.map((r: any) => r.id));
  const local = loadReports();
  // 当前用户本地无报告时，把游客/旧版全局 key 下的报告纳入待推送候选（1 小时内自动迁移到本账号；
  // 更早的旧数据按"已删残留/过期快照"丢弃，不会被串到当前账号）。
  const legacy = local.length === 0 ? loadLegacyReports() : [];
  const candidates = legacy.length
    ? [...local, ...legacy.filter((l) => !local.some((x) => x.id === l.id))]
    : local;
  const localOnly = candidates.filter((r) => !serverIds.has(r.id) && !deleted.has(r.id));
  const now = Date.now();
  const kept: StoredReport[] = [];
  for (const r of localOnly) {
    const ageMs = now - reportTimeMs(r);
    if (ageMs <= RECENT_WINDOW_MS) {
      // 新报告：尝试推送到服务器；ok/网络失败都保留（下次再试），deleted 才丢弃
      const res = await syncReportToServerWithResult(r);
      if (res !== "deleted") kept.push(r);
    }
    // 旧报告（服务器没有）→ 已删残留/过期快照，丢弃
  }
  const merged = [...fresh, ...kept];
  saveReports(merged);
  return merged;
}
