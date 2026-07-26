"use client";

import { motion } from "framer-motion";
import { formatINR } from "@/lib/utils";

interface ProgressBarProps {
  current: number;
  threshold: number;
}

export function ProgressBar({ current, threshold }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, (current / threshold) * 100));

  return (
    <div className="w-full">
      <div className="relative h-9 w-full overflow-hidden border-2 border-ink bg-canvas">
        <motion.div
          className="relative h-full bg-lime-500"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            className="absolute right-0 top-0 h-full w-1 bg-lime-600"
            animate={{ opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-3">
          <span className="mono-figure text-xs font-semibold text-ink">
            {formatINR(current)} / {formatINR(threshold)}
          </span>
          <span className="mono-figure text-xs font-semibold text-ink">
            {pct.toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}
