"use client";

/**
 * 报告时长：后端 analysis 里存的 duration 可能是中文串（"3 分 2 秒"）。
 * 这里统一解析成秒数并按当前语言重新格式化，避免英文界面显示中文时长。
 */

export function durationSeconds(analysis: any): number | null {
  const sec = Number(analysis?.recording_duration_seconds ?? analysis?.duration_seconds);
  if (Number.isFinite(sec) && sec > 0) return sec;
  const d = String(analysis?.duration ?? "");
  // 中文格式："3 分 2 秒" / "20 秒"
  const m = d.match(/(\d+)\s*分/);
  const s = d.match(/(\d+)\s*秒/);
  if (m || s) {
    return (m ? Number(m[1]) * 60 : 0) + (s ? Number(s[1]) : 0);
  }
  // 纯数字串
  const n = Number(d.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function formatDuration(analysis: any, t: (key: string) => string): string {
  const sec = durationSeconds(analysis);
  if (sec == null) return "-";
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  const minU = t("timeMinShort");
  const secU = t("timeSecShort");
  if (m === 0) return `${r} ${secU}`;
  if (r === 0) return `${m} ${minU}`;
  return `${m} ${minU} ${r} ${secU}`;
}
