"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  open: boolean;
  onVerify: (token: string) => void;
  onClose?: () => void;
}

/** 简单数学验证码：后端返回 question_id + 问题，用户输入答案 */
export default function CaptchaModal({ open, onVerify, onClose }: Props) {
  const [qid, setQid] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 弹窗打开时获取题目
  useEffect(() => {
    if (!open) return;
    setAnswer("");
    setError("");
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/auth/captcha`, { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (data.qid) { setQid(data.qid); setQuestion(data.question); }
        else { setError("验证码加载失败"); }
      })
      .catch(() => setError("网络错误"))
      .finally(() => setLoading(false));
  }, [open]);

  // 提交验证
  const handleSubmit = async () => {
    if (!answer.trim()) return;
    setLoading(true);
    try {
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/auth/captcha/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ qid, answer: answer.trim() }),
      });
      const data = await resp.json();
      if (data.success) {
        onVerify(data.token);
      } else {
        setError(data.error || "答案错误");
        setAnswer("");
      }
    } catch {
      setError("验证失败");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--color-surface)] rounded-2xl p-8 shadow-2xl border border-[var(--color-border)] max-w-sm w-full mx-4">
        <div className="text-center mb-6">
          <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center mx-auto mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-primary)]"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
          </div>
          <h3 className="text-lg font-semibold text-[var(--color-text)]">人机验证</h3>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">请回答以下问题</p>
        </div>

        {loading && !question ? (
          <div className="text-center text-sm text-[var(--color-text-secondary)] py-4">加载中...</div>
        ) : (
          <>
            <div className="bg-[var(--color-bg)] rounded-xl p-4 mb-4 text-center">
              <span className="text-2xl font-bold text-[var(--color-text)] tracking-wider select-none">
                {question}
              </span>
              <span className="block text-xs text-[var(--color-text-secondary)] mt-1">
                {question && "= ?"}
              </span>
            </div>

            <input
              type="text"
              inputMode="numeric"
              autoFocus
              value={answer}
              onChange={(e) => { setAnswer(e.target.value); setError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              className="w-full px-4 py-3 rounded-xl border text-center text-lg bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)]"
              placeholder="输入答案"
            />

            {error && (
              <p className="text-red-500 text-sm mt-2 text-center">{error}</p>
            )}

            <div className="flex gap-2 mt-4">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--color-bg)] text-[var(--color-text)] text-sm font-medium border border-[var(--color-border)] hover:opacity-80 transition-opacity"
                >
                  取消
                </button>
              )}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !answer.trim()}
                className="flex-1 py-2.5 rounded-xl bg-[var(--color-primary)] text-[var(--color-bg)] text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {loading ? "验证中..." : "确认"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
