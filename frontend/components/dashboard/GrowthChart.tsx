"use client";

import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { PerLotTable } from "./PerLotTable";
import { formatDateShort, formatINR } from "@/lib/utils";
import type { GrowthPoint, LedgerLotOut } from "@/lib/types";

type Range = "7D" | "30D" | "All";

export function GrowthChart({
  series,
  lots,
}: {
  series: GrowthPoint[];
  lots: LedgerLotOut[];
}) {
  const [range, setRange] = useState<Range>("All");

  const filtered = useMemo(() => {
    if (range === "All" || series.length === 0) return series;
    const days = range === "7D" ? 7 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const inRange = series.filter((p) => new Date(p.date) >= cutoff);
    return inRange.length > 0 ? inRange : series.slice(-2);
  }, [series, range]);

  return (
    <section aria-label="Portfolio growth" className="border-b border-ink/15 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold">Growth</h2>
        <SegmentedControl
          options={[
            { label: "7D", value: "7D" },
            { label: "30D", value: "30D" },
            { label: "All", value: "All" },
          ]}
          value={range}
          onChange={setRange}
        />
      </div>

      {filtered.length < 2 ? (
        <div className="flex h-64 items-center justify-center border border-dashed border-ink/20 text-sm text-ink/45">
          Not enough history yet — this fills in as more round-ups execute.
        </div>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filtered} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D6FF3D" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#D6FF3D" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#E4E4DD" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDateShort}
                tick={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#0B0B0B" }}
                axisLine={{ stroke: "#0B0B0B" }}
                tickLine={false}
                minTickGap={32}
              />
              <YAxis
                tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
                tick={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "#0B0B0B" }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip
                formatter={(value) => [formatINR(Number(value) || 0), "Value"]}
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
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#0B0B0B"
                strokeWidth={2}
                fill="url(#growthFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {lots.length > 0 && <PerLotTable lots={lots} />}
    </section>
  );
}
