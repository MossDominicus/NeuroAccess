"use client";

import { useLang } from "@/lib/language-context";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface FrequencyChartProps {
  frequencyData: any;
}

export default function FrequencyChart({ frequencyData }: FrequencyChartProps) {
  const { t } = useLang();
  if (!frequencyData) return null;

  const bandpowerData = frequencyData.average_bandpower
    ? Object.entries(frequencyData.average_bandpower).map(([band, power]) => ({
        band: t("band" + band.charAt(0).toUpperCase() + band.slice(1)) || band.charAt(0).toUpperCase() + band.slice(1),
        power: Number((power as number).toExponential(2)),
      }))
    : [];

  // 优先使用 frequency_distribution_array（[{frequency, power}]），fallback 到 frequency_distribution
  const distRaw = frequencyData.frequency_distribution_array || frequencyData.frequency_distribution || [];
  let distributionData = Array.isArray(distRaw) ? distRaw : [];
  // 若仍为空，用 average_bandpower 合成（delta/theta/alpha/beta 中心频率），
  // 保证旧报告也能显示频率分布，无需重新分析。
  if (distributionData.length === 0) {
    const bp = frequencyData.average_bandpower || frequencyData.bandpower || {};
    const bandCenters: Record<string, number> = { delta: 2.5, theta: 6.5, alpha: 10, beta: 22 };
    distributionData = Object.keys(bp)
      .filter((k) => bandCenters[k] !== undefined && typeof (bp as any)[k] === "number")
      .map((k) => ({ frequency: bandCenters[k], power: Number((bp as any)[k]) }));
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center">
          <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">f</span>
        </div>
        <div>
          <h3 className="font-bold text-[var(--color-text)]">{t("frequencyAnalysisTitle")}</h3>
          <p className="text-xs text-[var(--color-text-secondary)]">{t("avgBandpowerSubtitle")}</p>
        </div>
      </div>

      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 hover:shadow-lg hover:shadow-gray-900/5 transition-all duration-300">
        <h4 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-4">{t("avgBandpowerTitle")}</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={bandpowerData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="band" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value: any) => [`${value}`, t("energyLabel")]} />
            <Legend formatter={() => t("chartLegendPower")} />
            <Bar dataKey="power" fill="#4f46e5" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {distributionData.length > 0 && (
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 hover:shadow-lg hover:shadow-gray-900/5 transition-all duration-300">
          <h4 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-4">{t("frequencyDistributionTitle")}</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={distributionData.slice(0, 200)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="frequency"
                tick={{ fontSize: 10 }}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="power" fill="#06b6d4" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
