"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CaretDown } from "@phosphor-icons/react";
import { formatDate, formatINR } from "@/lib/utils";
import type { LedgerLotOut } from "@/lib/types";

export function PerLotTable({ lots }: { lots: LedgerLotOut[] }) {
  const [open, setOpen] = useState(false);
  const maxValue = Math.max(...lots.map((l) => l.current_value), 1);

  return (
    <div className="border-t border-ink/15">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-4 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold">
          Per-lot breakdown &middot; {lots.length} lot{lots.length === 1 ? "" : "s"}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
        >
          <CaretDown size={16} weight="bold" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="overflow-x-auto pb-6">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-ink/15 text-left">
                    <Th>Purchase date</Th>
                    <Th align="right">Invested</Th>
                    <Th align="right">Price at purchase</Th>
                    <Th align="right">Units</Th>
                    <Th align="right">Current value</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/10">
                  {lots.map((lot, i) => (
                    <tr key={i}>
                      <td className="py-2.5 pr-4 mono-figure text-ink/70">
                        {formatDate(lot.purchase_date)}
                      </td>
                      <td className="py-2.5 pr-4 text-right mono-figure">
                        {formatINR(lot.amount_invested)}
                      </td>
                      <td className="py-2.5 pr-4 text-right mono-figure text-ink/70">
                        {formatINR(lot.price_at_purchase)}
                      </td>
                      <td className="py-2.5 pr-4 text-right mono-figure text-ink/70">
                        {lot.current_units.toFixed(4)}
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 w-16 bg-ink/10">
                            <div
                              className="h-full bg-lime-500"
                              style={{ width: `${(lot.current_value / maxValue) * 100}%` }}
                            />
                          </div>
                          <span className="mono-figure w-24 text-right">
                            {formatINR(lot.current_value)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
