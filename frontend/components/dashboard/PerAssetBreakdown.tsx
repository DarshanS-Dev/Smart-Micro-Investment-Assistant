"use client";

import { ChartLineUp, Coins, CurrencyBtc } from "@phosphor-icons/react";
import { formatINR, formatPercent } from "@/lib/utils";
import { ASSET_LABEL, type AssetBreakdown, type AssetBucket } from "@/lib/types";

// Same icon set as the onboarding bucket cards, so an asset always reads
// the same way everywhere it appears in the app.
const ASSET_ICON: Record<AssetBucket, typeof ChartLineUp> = {
  nifty50: ChartLineUp,
  gold: Coins,
  crypto: CurrencyBtc,
};

export function PerAssetBreakdown({ assets }: { assets: AssetBreakdown[] }) {
  // Mirrors the empty-state convention used by SpendingInsights: render
  // nothing rather than an empty shell when there's nothing to show yet
  // (a brand new user with zero ledger rows has an empty per_asset array).
  if (!assets || assets.length === 0) return null;

  const sorted = [...assets].sort((a, b) => b.current_value - a.current_value);

  return (
    <section aria-label="Per-asset breakdown" className="border-b border-ink/15 py-8">
      <h2 className="mb-4 font-display text-xl font-semibold">By asset</h2>

      <ul className="divide-y divide-ink/10 border-t border-ink/15">
        {sorted.map((row) => {
          const Icon = ASSET_ICON[row.asset] ?? ChartLineUp;
          const gainAmount = Math.round((row.current_value - row.total_invested) * 100) / 100;
          const gainPercent =
            row.total_invested > 0
              ? Math.round((gainAmount / row.total_invested) * 10000) / 100
              : 0;
          const isPositive = gainAmount >= 0;

          return (
            <li
              key={row.asset}
              className="flex flex-wrap items-center justify-between gap-3 py-4"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center border-2 border-ink bg-lime-100">
                  <Icon size={18} weight="light" strokeWidth={1.5} />
                </span>
                <span className="font-medium">
                  {ASSET_LABEL[row.asset] ?? row.asset}
                </span>
              </div>

              <div className="flex items-center gap-6 text-right">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-ink/45">
                    Invested
                  </p>
                  <p className="mono-figure text-sm text-ink/70">
                    {formatINR(row.total_invested)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-ink/45">
                    Value
                  </p>
                  <p className="mono-figure text-sm font-semibold">
                    {formatINR(row.current_value)}
                  </p>
                </div>
                <div className="min-w-[84px]">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-ink/45">
                    Gain / Loss
                  </p>
                  <p
                    className={`mono-figure text-sm font-semibold ${
                      isPositive ? "text-positive" : "text-negative"
                    }`}
                  >
                    {formatPercent(gainPercent)}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}