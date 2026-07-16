import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

export function StreakBadge({
  days,
  className,
  size = "md",
}: {
  days: number;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-brand-muted font-semibold text-brand-strong",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        className,
      )}
    >
      <Flame className={size === "sm" ? "size-3.5" : "size-4"} aria-hidden />
      {days} day{days === 1 ? "" : "s"}
    </span>
  );
}
