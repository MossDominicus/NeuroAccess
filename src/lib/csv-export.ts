"use client";

/**
 * CSV 下载：直接导出每个通道的原始波形时间序列 (μV)，
 * 每列一个通道。
 */
export async function downloadCSV(reportId: string, fileName: string) {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("neuroaccess-token") || "" : "";
    if (!token) { return void alert("请先登录"); }

    // 1. 从服务器拉报告
    const resp = await fetch("/api/reports/get", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: reportId }),
    });
    const data = await resp.json();
    if (!data?.success || !data?.report) { return void alert("服务器取报告失败"); }

    const report = data.report;
    const analysis = report.analysis || report;
    const wp = analysis.waveform_preview || {};
    const channelData: Record<string, number[]> = wp.channels || {};
    const chNames = Object.keys(channelData);
    const times: number[] = wp.times || [];

    // 2. 直接生成 CSV：时间列 + 每通道一列
    const headers = ["Time(s)", ...chNames];
    const rows: string[][] = [];
    const n = times.length || (chNames.length > 0 ? channelData[chNames[0]].length : 0);
    for (let i = 0; i < n; i++) {
      rows.push([
        (times[i] ?? i / (analysis.sampling_rate || 128)).toFixed(3),
        ...chNames.map(ch => {
          const v = channelData[ch]?.[i];
          return v != null ? v.toFixed(4) : "";
        }),
      ]);
    }

    // 波形预览经过后端 step 降采样，原始采样率 ≠ 实际点间距；
    // 从 times 数组推真实采样率用于头部注释，避免误导。
    let effSr: number | null = null;
    if (times.length > 1 && times[1] > times[0]) effSr = Math.round(1 / (times[1] - times[0]));

    const csv = "\uFEFF" + [
      `# File: ${fileName}`,
      `# Channels: ${chNames.length}`,
      `# Sampling rate: ${effSr ?? analysis.sampling_rate ?? "N/A"} Hz (waveform preview, downsampled)`,
      `# Duration: ${(() => { const d = analysis.duration ?? analysis.recording_duration_seconds ?? "N/A"; return typeof d === "number" ? d + " s" : d; })()}`,
      `# Unit: μV (microvolts)`,
      `# Raw waveform time series from waveform_preview`,
      ``,
      headers.join(","),
      ...rows.map(r => r.join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (fileName || "eeg").replace(/\.[^.]+$/, "") + "_raw_waveform.csv";
    a.style.cssText = "display:none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 2000);
  } catch (e) {
    console.error("CSV error:", e);
    alert("下载失败: " + (e as Error).message);
  }
}