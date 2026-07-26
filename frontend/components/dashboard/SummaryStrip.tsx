"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowsClockwise } from "@phosphor-icons/react";
import { formatINR, formatPercent, formatDateTime } from "@/lib/utils";
import { Sparkline } from "./Sparkline";
import type { GrowthPoint } from "@/lib/types";

interface SummaryStripProps {
  totalInvested: number;
  currentValue: number;
  gainLossAmount: number;
  gainLossPercent: number;
  priceUpdatedAt: string;
  growthSeries: GrowthPoint[];
  onRefresh: () => Promise<void>;
}

export function SummaryStrip({
  totalInvested,
  currentValue,
  gainLossAmount,
  gainLossPercent,
  priceUpdatedAt,
  growthSeries,
  onRefresh,
}: SummaryStripProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [flash, setFlash] = useState(false);
  const isPositive = gainLossAmount >= 0;

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await onRefresh();
      setFlash(true);
      window.setTimeout(() => setFlash(false), 400);
    } finally {
      setRefreshing(false);
      setCooldown(8);
    }
  }

  return (
    <section aria-label="Portfolio summary" className="border-b border-ink/15 pb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold">Your portfolio</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink/45">
            Updated {formatDateTime(priceUpdatedAt)}
          </span>
          <button
            onClick={handleRefresh}
            disabled={refreshing || cooldown > 0}
            className="flex h-11 items-center gap-2 border-2 border-ink px-4 text-sm font-semibold transition-colors hover:bg-ink hover:text-canvas disabled:cursor-not-allowed disabled:border-ink/20 disabled:text-ink/30 disabled:hover:bg-transparent disabled:hover:text-ink/30"
          >
            <ArrowsClockwise size={16} weight="bold" className={refreshing ? "animate-spin" : ""} />
            {cooldown > 0 ? `Wait ${cooldown}s` : "Refresh Prices"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-ink/15 border-t border-ink/15 md:grid-cols-4">
        <Stat label="Total Invested" value={formatINR(totalInvested)} flash={flash} />
        <Stat
          label="Current Value"
          value={formatINR(currentValue)}
          flash={flash}
          extra={
            growthSeries.length > 1 ? (
              <Sparkline
                values={growthSeries.map((p) => p.value)}
                positive={isPositive}
              />
            ) : undefined
          }
        />
        <Stat
          label="Gain / Loss"
          value={formatINR(gainLossAmount)}
          tone={isPositive ? "positive" : "negative"}
          flash={flash}
        />
        <Stat
          label="Gain / Loss %"
          value={formatPercent(gainLossPercent)}
          tone={isPositive ? "positive" : "negative"}
          flash={flash}
        />
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
  flash,
  extra,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
  flash: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 px-5 py-6 first:pl-0">
      <span className="text-xs font-medium uppercase tracking-wide text-ink/45">{label}</span>
      <div className="flex items-end justify-between gap-2">
        <AnimatePresence mode="wait">
          <motion.span
            key={value}
            initial={flash ? { backgroundColor: "#D6FF3D" } : false}
            animate={{ backgroundColor: "rgba(214,255,61,0)" }}
            transition={{ duration: 0.4 }}
            className={`mono-figure text-2xl font-semibold ${
              tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : "text-ink"
            }`}
          >
            {value}
          </motion.span>
        </AnimatePresence>
        {extra}
      </div>
    </div>
  );
}
