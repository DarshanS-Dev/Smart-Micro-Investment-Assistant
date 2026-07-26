import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function GridCanvas({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative min-h-dvh w-full grid-texture bg-canvas", className)}>
      {children}
    </div>
  );
}
