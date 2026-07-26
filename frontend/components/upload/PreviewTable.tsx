"use client";

import { motion } from "framer-motion";
import { formatDate, formatINR } from "@/lib/utils";

export interface PreviewRow {
  date: string;
  merchant: string;
  amount: number;
  roundup: number;
}

export function PreviewTable({ rows }: { rows: PreviewRow[] }) {
  if (rows.length === 0) return null;

  return (
    <div className="mt-10">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink/50">
        Preview — {rows.length} transaction{rows.length === 1 ? "" : "s"}
      </p>
      <div className="max-h-[420px] overflow-y-auto border-t border-ink/15">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-canvas">
            <tr className="border-b border-ink/15 text-left">
              <th className="py-2 pr-4 text-xs font-medium uppercase tracking-wide text-ink/50">
                Date
              </th>
              <th className="py-2 pr-4 text-xs font-medium uppercase tracking-wide text-ink/50">
                Merchant
              </th>
              <th className="py-2 pr-4 text-right text-xs font-medium uppercase tracking-wide text-ink/50">
                Amount
              </th>
              <th className="py-2 text-right text-xs font-medium uppercase tracking-wide text-ink/50">
                Round-up
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {rows.map((row, i) => (
              <motion.tr
                key={`${row.date}-${row.merchant}-${i}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  delay: Math.min(i, 8) * 0.04,
                  ease: "easeOut",
                }}
              >
                <td className="py-2.5 pr-4 mono-figure text-ink/70">{formatDate(row.date)}</td>
                <td className="py-2.5 pr-4">{row.merchant}</td>
                <td className="py-2.5 pr-4 text-right mono-figure">{formatINR(row.amount)}</td>
                <td className="py-2.5 text-right mono-figure text-positive">
                  +{formatINR(row.roundup)}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
