"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
}

const base =
  "relative inline-flex items-center justify-center gap-2 font-body font-semibold text-[15px] " +
  "px-6 min-h-11 min-w-11 transition-transform duration-100 ease-out select-none " +
  "active:translate-y-px disabled:active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2";

const variants: Record<Variant, string> = {
  primary:
    "bg-lime-500 text-ink border-2 border-ink hover:bg-lime-600 disabled:bg-ink/10 disabled:text-ink/30 disabled:border-transparent disabled:cursor-not-allowed",
  secondary:
    "bg-transparent text-ink border-2 border-ink hover:bg-ink hover:text-canvas disabled:border-ink/20 disabled:text-ink/30 disabled:cursor-not-allowed",
  ghost:
    "bg-transparent text-ink border-2 border-transparent underline decoration-transparent hover:decoration-ink underline-offset-4 disabled:text-ink/30 disabled:cursor-not-allowed px-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", loading, fullWidth, disabled, className, children, ...rest },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], fullWidth && "w-full", className)}
        {...rest}
      >
        <span className={cn("inline-flex items-center gap-2", loading && "opacity-0")}>
          {children}
        </span>
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center gap-1.5">
            <Dot delay="0ms" />
            <Dot delay="150ms" />
            <Dot delay="300ms" />
          </span>
        )}
      </button>
    );
  }
);
Button.displayName = "Button";

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-1.5 w-1.5 rounded-full bg-current animate-bounce"
      style={{ animationDelay: delay }}
    />
  );
}
