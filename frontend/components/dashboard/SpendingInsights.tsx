"use client";

import { PieChart, Pie, Cell, BarChart, Bar, YAxis, XAxis, ResponsiveContainer, Tooltip } from "recharts";
import { formatINR } from "@/lib/utils";
import type { CategoryInsight } from "@/lib/types";

// Lime + ink + one neutral, differentiated by opacity — no rainbow palette.
const SLICE_OPACITIES = [1, 0.75, 0.55, 0.4, 0.28, 0.18];

export function SpendingInsights({ categories }: { categories: CategoryInsight[] }) {
  if (!categories || categories.length === 0) return null;

  const sorted = [...categories].sort((a, b) => b.total_spent - a.total_spent);

  return (
    <section aria-label="Spending insights" className="py-8">
      <h2 className="mb-6 font-display text-xl font-semibold">Spending insights</h2>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
        {/* Donut: spend by category */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={sorted}
                dataKey="total_spent"
                nameKey="category"
                innerRadius="58%"
                outerRadius="90%"
                paddingAngle={2}
                stroke="#0B0B0B"
                strokeWidth={1}
              >
                {sorted.map((_, i) => (
                  <Cell
                    key={i}
                    fill="#D6FF3D"
                    fillOpacity={SLICE_OPACITIES[i % SLICE_OPACITIES.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatINR(Number(value) || 0)}
                contentStyle={{
                  background: "#0B0B0B",
                  border: "none",
                  borderRadius: 0,
                  color: "#FAFAF7",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar: round-up generated per category, same order as donut */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={sorted}
              layout="vertical"
              margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="category"
                width={110}
                tick={{ fontFamily: "var(--font-body)", fontSize: 12, fill: "#0B0B0B" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value) => [formatINR(Number(value) || 0), "Round-up"]}
                contentStyle={{
                  background: "#0B0B0B",
                  border: "none",
                  borderRadius: 0,
                  color: "#FAFAF7",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                }}
                cursor={{ fill: "rgba(11,11,11,0.05)" }}
              />
              <Bar dataKey="roundup_generated" fill="#0B0B0B" maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <ul className="mt-8 divide-y divide-ink/10 border-t border-ink/15">
        {sorted.map((c) => (
          <li key={c.category} className="flex items-center justify-between py-3 text-sm">
            <span>{c.category}</span>
            <span className="flex gap-6">
              <span className="mono-figure text-ink/70">{formatINR(c.total_spent)}</span>
              <span className="mono-figure text-positive">+{formatINR(c.roundup_generated)}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
