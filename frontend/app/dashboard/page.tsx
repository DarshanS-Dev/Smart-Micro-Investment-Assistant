"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GridCanvas } from "@/components/ui/GridCanvas";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { SummaryStrip } from "@/components/dashboard/SummaryStrip";
import { GrowthChart } from "@/components/dashboard/GrowthChart";
import { LedgerTable } from "@/components/dashboard/LedgerTable";
import { SpendingInsights } from "@/components/dashboard/SpendingInsights";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { useAuth } from "@/lib/auth-context";
import { getDashboardSummary, refreshPrices, ApiError } from "@/lib/api";
import { DEV_BYPASS_TOKEN, MOCK_DASHBOARD } from "@/lib/mock-data";
import type { DashboardResponse } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const { ready, authenticated } = useRequireAuth();
  const { user } = useAuth();

  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const summary = await getDashboardSummary();
      if (summary.has_data === false) {
        router.replace("/upload");
        return;
      }
      setData(summary);
    } catch (err) {
      // Backend unreachable in dev-bypass mode → show mock data.
      const isNetworkError = err instanceof ApiError && err.status === 0;
      const isDevBypass =
        typeof window !== "undefined" &&
        window.sessionStorage.getItem("lpb_token") === DEV_BYPASS_TOKEN;

      if (isNetworkError && isDevBypass) {
        setData(MOCK_DASHBOARD);
        return;
      }

      // No data yet (404-style) or backend not reachable — fail soft to
      // the upload flow rather than rendering a blank dashboard.
      if (err instanceof ApiError && (err.status === 404 || err.status === 0)) {
        router.replace("/upload");
        return;
      }
      setError(err instanceof ApiError ? err.message : "Couldn't load your dashboard.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // Fetch-on-mount once auth has hydrated; load() manages its own state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ready && authenticated) load();
  }, [ready, authenticated, load]);

  async function handleRefresh() {
    await refreshPrices();
    const summary = await getDashboardSummary();
    setData(summary);
  }

  if (!ready || !authenticated) {
    return <GridCanvas />;
  }

  return (
    <div className="min-h-dvh bg-canvas">
      <DashboardHeader />

      <main className="mx-auto w-full max-w-5xl px-6 pb-24 md:px-8">
        {loading && (
          <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-ink/50">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="h-8 w-8 border-2 border-ink/20 border-t-ink"
            />
            <p className="text-sm">Loading your portfolio…</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
            <p className="max-w-sm text-sm text-negative">{error}</p>
            <button
              onClick={load}
              className="h-11 border-2 border-ink px-5 text-sm font-semibold hover:bg-ink hover:text-canvas"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && data && (
          <div className="flex flex-col">
            <SummaryStrip
              totalInvested={data.total_invested}
              currentValue={data.current_value}
              gainLossAmount={data.gain_loss_amount}
              gainLossPercent={data.gain_loss_percent}
              priceUpdatedAt={data.price_updated_at}
              growthSeries={data.growth_series}
              onRefresh={handleRefresh}
            />
            <GrowthChart series={data.growth_series} lots={data.lots} />
            <LedgerTable
              feed={data.transaction_feed}
              pendingBalance={data.pending_roundup_balance}
              threshold={data.roundup_threshold}
              asset={user?.asset_bucket ?? null}
            />
            <SpendingInsights categories={data.category_insights} />
          </div>
        )}
      </main>
    </div>
  );
}
