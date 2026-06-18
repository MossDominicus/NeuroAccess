"use client";

// ═══════════════════════════════════════════════════════════════
// EEGGenerationManager — 独立于页面的 EEG 生成任务管理器
//
// 设计:
//  - 单例模块级变量（跨组件 unmount/remount 存活）
//  - localStorage 持久化（跨页面刷新存活）
//  - 订阅模式（多个组件可监听状态变化）
//  - fetch 在后台运行，不绑定组件生命周期
// ═══════════════════════════════════════════════════════════════

const LS_KEY = "neuroaccess-eeg-gen-task";
const RESULT_LS_KEY = "neuroaccess-eeg-gen-result";

type GenStatus = "idle" | "running" | "completed" | "failed";
type GenListener = () => void;

interface GenState {
  status: GenStatus;
  progress: number;       // 0-100 (当前粗糙估计：发送 0，收到 50，渲染 100)
  startedAt: number;       // Date.now()
  error: string | null;
  params: Record<string, any> | null;
}

interface GenResult {
  data: any;               // 生成结果 (channels, times, psd 等)
  params: Record<string, any>;
  generatedAt: number;
}

// ── 模块级状态（跨组件存活）──────────────────────────────────
let _state: GenState = { status: "idle", progress: 0, startedAt: 0, error: null, params: null };
let _result: GenResult | null = null;
let _listeners: Set<GenListener> = new Set();
let _abortController: AbortController | null = null;

// ── localStorage 读写 ─────────────────────────────────────────
function _loadState(): GenState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}
function _saveState() {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(LS_KEY, JSON.stringify(_state)); } catch {}
}
function _clearState() {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(LS_KEY); } catch {}
}

function _loadResult(): GenResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(RESULT_LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}
function _saveResult(r: GenResult) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(RESULT_LS_KEY, JSON.stringify(r)); } catch {}
}
function _clearResult() {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(RESULT_LS_KEY); } catch {}
}

// ── 初始化：恢复上次状态 ──────────────────────────────────────
(function _init() {
  if (typeof window === "undefined") return;
  const saved = _loadState();
  if (saved && saved.status === "running") {
    // 上次刷新前正在运行 → 标记为 failed（无法恢复已中断的 fetch）
    _state = { ...saved, status: "failed", error: "Generation interrupted by page refresh" };
    _saveState();
  }
  _result = _loadResult();
})();

// ── 通知所有订阅者 ────────────────────────────────────────────
function _notify() {
  _listeners.forEach((fn) => {
    try { fn(); } catch {}
  });
}

// ── 公共 API ──────────────────────────────────────────────────
export const EEGGenerationManager = {
  /** 获取当前生成状态 */
  getState(): GenState {
    return { ..._state };
  },

  /** 获取当前进度 0-100 */
  getProgress(): number {
    return _state.progress;
  },

  /** 获取生成结果 */
  getResult(): GenResult | null {
    return _result ? { ..._result } : null;
  },

  /** 订阅状态变化 */
  subscribe(listener: GenListener): () => void {
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
  },

  /** 获取订阅者数量 */
  get subscriberCount(): number {
    return _listeners.size;
  },

  /** 开始生成 EEG */
  async start(params: Record<string, any>): Promise<void> {
    // 取消之前的任务
    if (_abortController) {
      _abortController.abort();
    }
    _abortController = new AbortController();

    _state = {
      status: "running",
      progress: 5,
      startedAt: Date.now(),
      error: null,
      params: { ...params },
    };
    _saveState();
    _notify();

    const token = (typeof window !== "undefined"
      ? localStorage.getItem("neuroaccess-token") || localStorage.getItem("neuroaccess_token") || ""
      : "");

    try {
      // 进度：发送请求
      _state.progress = 10;
      _saveState();
      _notify();

      const resp = await fetch("/api/eeg-simulator/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
        signal: _abortController.signal,
      });

      // 进度：收到响应
      _state.progress = 50;
      _saveState();
      _notify();

      const data = await resp.json();

      if (!data.success) {
        throw new Error(data.error || "Generation failed");
      }

      // 进度：处理完成
      _state.progress = 90;
      _saveState();
      _notify();

      // 保存结果
      _result = {
        data,
        params: { ...params },
        generatedAt: Date.now(),
      };
      _saveResult(_result);

      _state = {
        status: "completed",
        progress: 100,
        startedAt: _state.startedAt,
        error: null,
        params: { ...params },
      };
      _saveState();
      _notify();

      // 延迟清除 running 状态（让 UI 有时间显示 100%）
      setTimeout(() => {
        if (_state.status === "completed") {
          _clearState();
        }
      }, 5000);

    } catch (err: any) {
      if (err.name === "AbortError") {
        _state = { status: "idle", progress: 0, startedAt: 0, error: null, params: null };
      } else {
        _state = {
          status: "failed",
          progress: 0,
          startedAt: _state.startedAt,
          error: err?.message || String(err),
          params: { ...params },
        };
      }
      _saveState();
      _notify();
    } finally {
      _abortController = null;
    }
  },

  /** 取消生成 */
  cancel(): void {
    if (_abortController) {
      _abortController.abort();
      _abortController = null;
    }
    _state = { status: "idle", progress: 0, startedAt: 0, error: null, params: null };
    _clearState();
    _notify();
  },

  /** 清除结果 */
  clearResult(): void {
    _result = null;
    _clearResult();
    _notify();
  },

  /** 清除所有状态（调试用） */
  reset(): void {
    this.cancel();
    this.clearResult();
  },
};
