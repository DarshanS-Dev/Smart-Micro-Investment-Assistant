"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, id, className, ...rest }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className="flex flex-col gap-2">
        <label htmlFor={inputId} className="text-sm font-medium text-ink">
          {label}
        </label>
        <input
          id={inputId}
          ref={ref}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={cn(
            "h-11 border-b-2 bg-transparent px-0.5 text-base text-ink outline-none transition-colors",
            "placeholder:text-ink/30",
            error ? "border-negative" : "border-ink/25 focus:border-ink",
            className
          )}
          {...rest}
        />
        <p
          id={helperId}
          className={cn("text-xs text-ink/40 min-h-[1rem]", (error || !helperText) && "hidden")}
        >
          {helperText}
        </p>
        <p
          id={errorId}
          role="alert"
          className={cn(
            "text-xs text-negative min-h-[1rem] transition-opacity",
            error ? "opacity-100" : "opacity-0 h-0 overflow-hidden"
          )}
        >
          {error || "\u00A0"}
        </p>
      </div>
    );
  }
);
Input.displayName = "Input";
