"use client";

import { motion } from "framer-motion";
import type { Icon } from "@phosphor-icons/react";
import { Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface BucketCardProps {
  IconComponent: Icon;
  name: string;
  description: string;
  microcopy: string;
  selected: boolean;
  onSelect: () => void;
}

export function BucketCard({
  IconComponent,
  name,
  description,
  microcopy,
  selected,
  onSelect,
}: BucketCardProps) {
  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      animate={{ scale: selected ? 1.02 : 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={cn(
        "relative flex min-h-[220px] flex-col items-start gap-4 border p-6 text-left transition-colors",
        selected
          ? "border-2 border-ink bg-lime-500"
          : "border border-ink bg-canvas hover:bg-canvas-dim"
      )}
    >
      <div
        className={cn(
          "absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full border-2 border-ink transition-colors",
          selected ? "bg-ink" : "bg-transparent"
        )}
      >
        {selected && <Check size={14} weight="bold" className="text-lime-500" />}
      </div>

      <motion.span 
        className="flex h-12 w-12 items-center justify-center border-2 border-ink bg-canvas"
        animate={selected ? { scale: [1, 1.15, 1], rotate: [0, -5, 0] } : { scale: 1, rotate: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <IconComponent size={24} weight="light" strokeWidth={1.5} />
      </motion.span>

      <div>
        <h3 className="font-display text-2xl font-semibold tracking-[-0.01em]">{name}</h3>
        <p className="mt-1.5 text-sm text-ink/70">{description}</p>
      </div>

      <p className="mt-auto text-xs uppercase tracking-wide text-ink/45">{microcopy}</p>
    </motion.button>
  );
}
