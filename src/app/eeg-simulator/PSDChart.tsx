"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface PSDChartProps {
  data: any[];
}

export default function PSDChart({ data }: PSDChartProps) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          dataKey="freq"
          stroke="var(--color-text-secondary)"
          label={{ value: 'Frequency (Hz)', position: 'insideBottom', offset: -5, fill: 'var(--color-text-secondary)', fontSize: 11 }}
          tick={{ fontSize: 10 }}
        />
        <YAxis
          stroke="var(--color-text-secondary)"
          label={{ value: 'Power (μV²/Hz)', angle: -90, position: 'insideLeft', fill: 'var(--color-text-secondary)', fontSize: 11 }}
          tick={{ fontSize: 10 }}
          tickFormatter={(v: number) => v.toExponential(0)}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          formatter={(value: any) => Number(value).toExponential(2)}
        />
        <Line
          type="monotone"
          dataKey="power"
          stroke="var(--color-primary)"
          dot={false}
          strokeWidth={1.5}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
