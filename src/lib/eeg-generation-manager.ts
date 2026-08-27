// ═══════════════════════════════════════════════════════════════
// EEGGenerationManager — 独立于页面的 EEG 生成任务管理器
// 纯模块（无 "use client"），被客户端组件导入后自动成为客户端代码
// ═══════════════════════════════════════════════════════════════

const LS_KEY = "neuroaccess-eeg-gen-task";
const RESULT_LS_KEY = "neuroaccess-eeg-gen-result";
// 结果缓存版本：生成器算法每次大改后递增，使旧缓存失效并强制重新生成，
// 避免用户刷新后一直看到旧算法生成的"复制感"波形。
const RESULT_CACHE_VERSION = 3;

type GenStatus = "idle" | "running" | "completed" | "failed";
type GenListener = () => void;

interface GenState {
  status: GenStatus;
  progress: number;
  startedAt: number;
  error: string | null;
  params: Record<string, any> | null;
}

interface GenResult {
  data: any;
  params: Record<string, any>;
  generatedAt: number;
}

function _isBrowser(): boolean {
  return typeof window !== "undefined";
}

// ── 模块级状态 ──────────────────────────────────────────────
let _state: GenState = { status: "idle", progress: 0, startedAt: 0, error: null, params: null };
let _result: GenResult | null = null;
let _listeners: Set<GenListener> = new Set();
let _abortController: AbortController | null = null;
let _initialized = false;

// ── useSyncExternalStore 缓存快照（避免无限重渲染）─────────
let _cachedState: GenState = { ..._state };
let _cachedResult: GenResult | null = null;
let _stateVersion = 0;
let _resultVersion = 0;
let _cachedStateVersion = -1;
let _cachedResultVersion = -1;

// ── localStorage 读写 ─────────────────────────────────────────
function _loadState(): GenState | null {
  if (!_isBrowser()) return null;
  try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function _saveState() {
  if (!_isBrowser()) return;
  try { localStorage.setItem(LS_KEY, JSON.stringify(_state)); } catch {}
}
function _clearState() {
  if (!_isBrowser()) return;
  try { localStorage.removeItem(LS_KEY); } catch {}
}

function _loadResult(): GenResult | null {
  if (!_isBrowser()) return null;
  try {
    const raw = localStorage.getItem(RESULT_LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // 版本不匹配（旧算法生成的缓存）→ 丢弃，强制重新生成
    if (!parsed || parsed.v !== RESULT_CACHE_VERSION) return null;
    return parsed.data as GenResult;
  } catch { return null; }
}
function _saveResult(r: GenResult) {
  if (!_isBrowser()) return;
  try { localStorage.setItem(RESULT_LS_KEY, JSON.stringify({ v: RESULT_CACHE_VERSION, data: r })); } catch {}
}

// ── 通知订阅者 ──────────────────────────────────────────────
function _notify() {
  _stateVersion++; // 状态变化时增加版本号，触发缓存刷新
  _listeners.forEach((fn) => { try { fn(); } catch {} });
}

// ── 结果变化时标记版本 ──────────────────────────────────────
function _notifyResult() {
  _resultVersion++;
  _notify();
}

// ── 公共 API ─────────────────────────────────────────────────
export const EEGGenerationManager = {
  /** 初始化：每次进入页面都清空上次结果（用户要求：刷新/重新进入后不保留生成内容） */
  init() {
    if (_initialized || !_isBrowser()) return;
    _initialized = true;
    const saved = _loadState();
    if (saved && saved.status === "running") {
      _state = { ...saved, status: "failed", error: "Generation interrupted by page refresh" };
      _saveState();
    }
    // 清空上次生成结果：不恢复缓存，并清除残留缓存数据
    _result = null;
    try { localStorage.removeItem(RESULT_LS_KEY); } catch {}
    _notifyResult();
  },

  getState(): GenState {
    if (_stateVersion !== _cachedStateVersion) {
      _cachedState = { ..._state };
      _cachedStateVersion = _stateVersion;
    }
    return _cachedState;
  },

  getResult(): GenResult | null {
    if (_resultVersion !== _cachedResultVersion) {
      _cachedResult = _result ? { ..._result } : null;
      _cachedResultVersion = _resultVersion;
    }
    return _cachedResult;
  },

  /** init() 是否已执行（组件用它避免在缓存恢复前误判"无结果"而自动重新生成） */
  isInitialized(): boolean {
    return _initialized;
  },

  /** 是否有可用结果（直接读模块状态，不受 useSyncExternalStore 快照延迟影响） */
  hasResult(): boolean {
    return !!_result;
  },

  subscribe(listener: GenListener): () => void {
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
  },

  async start(params: Record<string, any>): Promise<void> {
    if (_abortController) _abortController.abort();
    _abortController = new AbortController();

    _state = { status: "running", progress: 5, startedAt: Date.now(), error: null, params: { ...params } };
    _saveState(); _notify();

    const token = _isBrowser()
      ? (localStorage.getItem("neuroaccess-token") || localStorage.getItem("neuroaccess_token") || "")
      : "";

    try {
      _state.progress = 10; _saveState(); _notify();

      const resp = await fetch("/api/eeg-simulator/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(params),
        signal: _abortController.signal,
      });

      _state.progress = 50; _saveState(); _notify();

      // 解析响应：兼容 JSON / 非 JSON（网关错误页）
      let data: any = {};
      const text = await resp.text();
      try { data = text ? JSON.parse(text) : {}; }
      catch { data = {}; }

      if (!resp.ok || !data.success) {
        const detail = data?.detail || data?.error || data?.message || "";
        const statusInfo = resp.status !== 200 ? ` (HTTP ${resp.status})` : "";
        // 401/403：token 无效，清除本地会话并跳登录页
        if (resp.status === 401 || resp.status === 403) {
          try {
            localStorage.removeItem("neuroaccess-token");
            localStorage.removeItem("neuroaccess-user");
          } catch {}
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
        }
        throw new Error(detail ? `${detail}${statusInfo}` : `Generation failed${statusInfo}`);
      }

      _state.progress = 90; _saveState(); _notify();

      _result = { data, params: { ...params }, generatedAt: Date.now() };
      _saveResult(_result);

      _state = { status: "completed", progress: 100, startedAt: _state.startedAt, error: null, params: { ...params } };
      _saveState(); _notifyResult();

      setTimeout(() => { if (_state.status === "completed") _clearState(); }, 5000);

    } catch (err: any) {
      if (err.name === "AbortError") {
        _state = { status: "idle", progress: 0, startedAt: 0, error: null, params: null };
      } else {
        _state = { status: "failed", progress: 0, startedAt: _state.startedAt, error: err?.message || String(err), params: { ...params } };
      }
      _saveState(); _notify();
    } finally {
      _abortController = null;
    }
  },

  cancel() {
    if (_abortController) { _abortController.abort(); _abortController = null; }
    _state = { status: "idle", progress: 0, startedAt: 0, error: null, params: null };
    _clearState(); _notify();
  },

  clearResult() {
    _result = null;
    if (_isBrowser()) { try { localStorage.removeItem(RESULT_LS_KEY); } catch {} }
    _notifyResult();
  },

  reset() {
    this.cancel();
    this.clearResult();
  },
};
