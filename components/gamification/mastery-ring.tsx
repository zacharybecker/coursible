"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Circular mastery meter, 0-100. */
export function MasteryRing({
  value,
  size = 44,
  strokeWidth = 5,
  className,
  showLabel = true,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <span
      className={cn("relative inline-flex items-center justify-center", className)}
      role="meter"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Mastery ${clamped}%`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="stroke-brand"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - clamped / 100) }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </svg>
      {showLabel && (
        <span className="absolute text-[10px] font-bold text-foreground">{clamped}</span>
      )}
    </span>
  );
}
