"use client";

import { motion } from "framer-motion";
import { CheckCircle } from "@phosphor-icons/react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { RoundupBarChart } from "./RoundupBarChart";
import { formatDate, formatINR, ASSET_LABEL_FALLBACK } from "@/lib/utils";
import { ASSET_LABEL, type TransactionFeedItem } from "@/lib/types";

interface LedgerTableProps {
  feed: TransactionFeedItem[];
  pendingBalance: number;
  threshold: number;
  asset: string | null;
}

export function LedgerTable({ feed, pendingBalance, threshold, asset }: LedgerTableProps) {
  const sorted = [...feed].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <section aria-label="Round-up ledger" className="border-b border-ink/15 py-8">
      <h2 className="mb-4 font-display text-xl font-semibold">Ledger</h2>

      <div className="mb-6">
        <ProgressBar current={pendingBalance} threshold={threshold} />
        <p className="mt-2 text-xs text-ink/45">
          Accumulating toward the next auto-invest into{" "}
          {asset ? ASSET_LABEL[asset as keyof typeof ASSET_LABEL] ?? ASSET_LABEL_FALLBACK : ASSET_LABEL_FALLBACK}.
        </p>
      </div>

      <RoundupBarChart feed={feed} />

      {sorted.length === 0 ? (
        <div className="flex h-40 items-center justify-center border border-dashed border-ink/20 text-sm text-ink/45">
          No transactions yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink/15 text-left">
                <Th>Date</Th>
                <Th>Merchant</Th>
                <Th align="right">Spend</Th>
                <Th align="right">Round-up</Th>
                <Th align="right">Cumulative</Th>
                <Th>Category</Th>
                <Th align="right">Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {sorted.map((row, i) => {
                const executed = row.status === "invested";
                return (
                  <motion.tr
                    key={`${row.date}-${row.merchant}-${i}`}
                    animate={{ opacity: executed ? 1 : 0.6 }}
                    transition={{ duration: 0.3 }}
                  >
                    <td className="py-2.5 pr-4 mono-figure text-ink/70">{formatDate(row.date)}</td>
                    <td className="py-2.5 pr-4">{row.merchant}</td>
                    <td className="py-2.5 pr-4 text-right mono-figure">{formatINR(row.amount)}</td>
                    <td className="py-2.5 pr-4 text-right mono-figure text-positive">
                      +{formatINR(row.roundup_amount)}
                    </td>
                    <td className="py-2.5 pr-4 text-right mono-figure text-ink/70">
                      {formatINR(row.cumulative_roundup)}
                    </td>
                    <td className="py-2.5 pr-4 text-ink/70">{row.category ?? "—"}</td>
                    <td className="py-2.5 text-right">
                      {executed ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-positive">
                          {i === 0 ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <motion.path 
                                initial={{ pathLength: 0 }} 
                                animate={{ pathLength: 1 }} 
                                transition={{ duration: 0.4, ease: "easeOut" }} 
                                d="M22 11.08V12a10 10 0 1 1-5.93-9.14" 
                              />
                              <motion.path 
                                initial={{ pathLength: 0 }} 
                                animate={{ pathLength: 1 }} 
                                transition={{ duration: 0.3, ease: "easeOut", delay: 0.2 }} 
                                d="M22 4L12 14.01l-3-3" 
                              />
                            </svg>
                          ) : (
                            <CheckCircle size={14} weight="fill" />
                          )}
                          Executed
                        </span>
                      ) : (
                        <span className="text-xs text-ink/45">Accumulating</span>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      className={`py-2 pr-4 text-xs font-medium uppercase tracking-wide text-ink/50 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}
