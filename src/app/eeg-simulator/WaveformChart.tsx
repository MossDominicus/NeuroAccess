"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

interface WaveformChartProps {
  data: any[];
  channelNames: string[];
  channelColors: string[];
}

export default function WaveformChart({ data, channelNames, channelColors }: WaveformChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          dataKey="time"
          stroke="var(--color-text-secondary)"
          label={{ value: 'Time (s)', position: 'insideBottom', offset: -5, fill: 'var(--color-text-secondary)', fontSize: 11 }}
          tick={{ fontSize: 10 }}
        />
        <YAxis
          stroke="var(--color-text-secondary)"
          label={{ value: 'μV', angle: -90, position: 'insideLeft', fill: 'var(--color-text-secondary)', fontSize: 11 }}
          tick={{ fontSize: 10 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        <Legend wrapperStyle={{ fontSize: '10px' }} />
        {channelNames.map((ch: string, i: number) => (
          <Line
            key={ch}
            type="monotone"
            dataKey={ch}
            stroke={channelColors[i % channelColors.length]}
            dot={false}
            strokeWidth={1}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
