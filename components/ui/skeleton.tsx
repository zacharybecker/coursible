import { cn } from "@/lib/utils";

/** A pulsing placeholder block, shown while data loads instead of a blank screen. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} aria-hidden />;
}
