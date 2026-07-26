"use client";

import { motion } from "framer-motion";

interface PillToggleProps {
  options: [string, string];
  value: 0 | 1;
  onChange: (index: 0 | 1) => void;
}

export function PillToggle({ options, value, onChange }: PillToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="Login or sign up"
      className="relative inline-flex h-11 items-center border-2 border-ink bg-canvas p-1"
    >
      <motion.div
        className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-lime-500"
        animate={{ left: value === 0 ? 4 : "calc(50% + 0px)" }}
        transition={{ type: "spring", stiffness: 400, damping: 32 }}
      />
      {options.map((label, i) => (
        <button
          key={label}
          role="tab"
          aria-selected={value === i}
          onClick={() => onChange(i as 0 | 1)}
          className="relative z-10 min-w-[104px] px-4 py-1.5 text-sm font-semibold text-ink transition-colors"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
