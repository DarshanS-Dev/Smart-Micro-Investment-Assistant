"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { formatDateShort, formatINR } from "@/lib/utils";
import type { TransactionFeedItem } from "@/lib/types";

export function RoundupBarChart({ feed }: { feed: TransactionFeedItem[] }) {
  const data = useMemo(() => {
    const byDate = new Map<string, number>();
    feed.forEach((item) => {
      byDate.set(item.date, (byDate.get(item.date) || 0) + item.roundup_amount);
    });
    return Array.from(byDate.entries())
      .map(([date, roundup]) => ({ date, roundup: Math.round(roundup * 100) / 100 }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);
  }, [feed]);

  if (data.length === 0) return null;

  return (
    <div className="mb-6 h-28 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="date"
            tickFormatter={formatDateShort}
            tick={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "#0B0B0B" }}
            axisLine={{ stroke: "#0B0B0B" }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis hide />
          <Tooltip
            formatter={(value) => [formatINR(Number(value) || 0), "Round-up"]}
            labelFormatter={(label) => formatDateShort(String(label))}
            contentStyle={{
              background: "#0B0B0B",
              border: "none",
              borderRadius: 0,
              color: "#FAFAF7",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
            }}
            labelStyle={{ color: "#D6FF3D" }}
            cursor={{ fill: "rgba(11,11,11,0.05)" }}
          />
          <Bar dataKey="roundup" fill="#D6FF3D" stroke="#0B0B0B" strokeWidth={1} maxBarSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
