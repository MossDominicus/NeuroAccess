const STORAGE_KEY = "neuroaccess-reports";

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

/** 从 localStorage 读取所有报告 */
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

/** 保存整组报告到 localStorage */
export function saveReports(reports: StoredReport[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch {
    // localStorage 满或不可用时忽略
  }
}

/** 新增一条报告 */
export function addReport(report: StoredReport): void {
  const reports = loadReports();
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
  const reports = loadReports();
  saveReports(reports.filter((r) => r.id !== id));
}

/** 根据 ID 获取单条报告 */
export function getReportById(id: string): StoredReport | null {
  const reports = loadReports();
  return reports.find((r) => r.id === id) || null;
}

/** 清空所有报告 */
export function clearAllReports(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
