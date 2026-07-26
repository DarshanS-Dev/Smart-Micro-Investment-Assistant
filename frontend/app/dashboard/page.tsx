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
import { getDashboard, refreshDashboard, ApiError } from "@/lib/api";
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
      const dashboard = await getDashboard();
      // Backend has no `has_data` flag — GET /dashboard returns 200 with
      // empty arrays/zeroed totals for a brand new user. We derive
      // "nothing uploaded yet" from that instead of a dedicated field.
      const hasData = dashboard.lots.length > 0 || dashboard.transaction_feed.length > 0;
      if (!hasData) {
        router.replace("/upload");
        return;
      }
      setData(dashboard);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        // Backend guard: asset_bucket not chosen yet.
        router.replace("/onboarding");
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
    // GAP: there is no POST /prices/refresh endpoint. GET /dashboard
    // already recomputes current prices from yfinance on every call
    // (app/services/portfolio.py), so "refresh" is just re-fetching it.
    const dashboard = await refreshDashboard();
    setData(dashboard);
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
            {/* GAP: category_insights is always [] today — categorizer.py
                is an empty stub on the backend, so Transaction.category
                is never set. SpendingInsights already renders nothing
                when the array is empty, which is the correct behavior
                here (no fake categories) rather than a bug to hide. */}
            <SpendingInsights categories={data.category_insights} />
          </div>
        )}
      </main>
    </div>
  );
}