// ═══════════════════════════════════════════════════════════════
// EEGGenerationManager — 独立于页面的 EEG 生成任务管理器
// 纯模块（无 "use client"），被客户端组件导入后自动成为客户端代码
// ═══════════════════════════════════════════════════════════════

const LS_KEY = "neuroaccess-eeg-gen-task";
const RESULT_LS_KEY = "neuroaccess-eeg-gen-result";

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
  try { const raw = localStorage.getItem(RESULT_LS_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function _saveResult(r: GenResult) {
  if (!_isBrowser()) return;
  try { localStorage.setItem(RESULT_LS_KEY, JSON.stringify(r)); } catch {}
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
  /** 初始化：从 localStorage 恢复状态（仅在客户端调用） */
  init() {
    if (_initialized || !_isBrowser()) return;
    _initialized = true;
    const saved = _loadState();
    if (saved && saved.status === "running") {
      _state = { ...saved, status: "failed", error: "Generation interrupted by page refresh" };
      _saveState();
    }
    _result = null;
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
      const data = await resp.json();
      if (!data.success) throw new Error(data.error || "Generation failed");

      _state.progress = 90; _saveState(); _notify();

      _result = { data, params: { ...params }, generatedAt: Date.now() };

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
