"use client";

import { motion } from "framer-motion";

interface SegmentedControlProps<T extends string> {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "sm",
}: SegmentedControlProps<T>) {
  const activeIndex = options.findIndex((o) => o.value === value);
  const pct = 100 / options.length;

  return (
    <div
      role="tablist"
      className="relative inline-flex border-2 border-ink bg-canvas p-1"
    >
      <motion.div
        className="absolute top-1 bottom-1 bg-ink"
        style={{ width: `calc(${pct}% - 4px)` }}
        animate={{ left: `calc(${activeIndex * pct}% + 4px)` }}
        transition={{ type: "tween", duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
      />
      {options.map((opt) => (
        <button
          key={opt.value}
          role="tab"
          aria-selected={opt.value === value}
          onClick={() => onChange(opt.value)}
          className={`relative z-10 min-w-11 px-3 font-mono transition-colors ${
            size === "sm" ? "py-1 text-xs" : "py-1.5 text-sm"
          } ${opt.value === value ? "text-canvas" : "text-ink/60"}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
