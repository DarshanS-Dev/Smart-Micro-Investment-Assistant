"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChartLineUp, Coins, CurrencyBtc } from "@phosphor-icons/react";
import { BucketCard } from "@/components/onboarding/BucketCard";
import { Button } from "@/components/ui/Button";
import { GridCanvas } from "@/components/ui/GridCanvas";
import { useAuth } from "@/lib/auth-context";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { ApiError } from "@/lib/api";
import { UNSUPPORTED_BUCKETS, type AssetBucket } from "@/lib/types";

const BUCKETS: {
  asset: AssetBucket;
  name: string;
  description: string;
  microcopy: string;
  icon: typeof ChartLineUp;
}[] = [
  {
    asset: "nifty50",
    name: "Nifty 50 Index",
    description: "A slice of India's 50 biggest companies, in one shot.",
    microcopy: "Why this? Broad, boring, historically reliable.",
    icon: ChartLineUp,
  },
  {
    asset: "gold",
    name: "Gold ETF",
    description: "Digital gold that trades like a stock, no locker needed.",
    microcopy: "Why this? A hedge that holds its ground.",
    icon: Coins,
  },
  {
    asset: "crypto",
    name: "Crypto",
    description: "Bitcoin, bought in spare-change-sized bites.",
    microcopy: "Why this? Small stakes, big upside swings.",
    icon: CurrencyBtc,
  },
];

// GAP: app/utils/constants.py::YFINANCE_TICKERS only maps "nifty50" and
// "gold" to a real ticker. The onboarding schema still accepts "crypto",
// but the first time a crypto user's round-up jar fires,
// ledger_service.execute_investments raises ValueError and the upload
// endpoint just refunds the jar — no trade ever executes, silently.
// Disabling it here (frontend-only fix) rather than letting anyone pick
// a bucket that can never actually invest.
const DISABLED_REASON = "Not priced by the backend yet — investments can't execute for this bucket.";

export default function OnboardingPage() {
  const router = useRouter();
  const { ready, authenticated } = useRequireAuth();
  const { setBucket } = useAuth();

  const [selected, setSelected] = useState<AssetBucket | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      await setBucket(selected);
      router.push("/upload");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save your pick. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!ready || !authenticated) {
    return <GridCanvas />;
  }

  return (
    <GridCanvas>
      <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col justify-center px-6 py-20 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
            Step 1 of 2
          </p>
          <h1 className="text-balance font-display text-4xl font-semibold tracking-[-0.02em] sm:text-5xl">
            Round up your spending.
            <br />
            Invest the spare change — automatically.
          </h1>
        </motion.div>

        <div role="radiogroup" aria-label="Choose an asset" className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {BUCKETS.map((b, i) => {
            const disabled = UNSUPPORTED_BUCKETS.includes(b.asset);
            return (
              <motion.div
                key={b.asset}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
              >
                <BucketCard
                  IconComponent={b.icon}
                  name={b.name}
                  description={b.description}
                  microcopy={b.microcopy}
                  selected={selected === b.asset}
                  onSelect={() => setSelected(b.asset)}
                  disabled={disabled}
                  disabledReason={disabled ? DISABLED_REASON : undefined}
                />
              </motion.div>
            );
          })}
        </div>

        {error && (
          <p role="alert" className="mt-6 text-sm text-negative">
            {error}
          </p>
        )}

        <div className="mt-10 flex justify-end">
          <Button onClick={handleConfirm} disabled={!selected} loading={loading}>
            Confirm &amp; Continue
          </Button>
        </div>
      </main>
    </GridCanvas>
  );
}