"use client";

import { cn } from "@/lib/utils";

export function PageTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "animate-[pageFadeIn_320ms_ease-out] transition-all",
        className,
      )}
    >
      {children}
    </div>
  );
}
