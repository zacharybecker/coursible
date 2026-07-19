"use client";

// Client-side read dedup. HeaderStats renders twice (desktop TopNav +
// MobileNav; CSS hides one), and the home/profile pages also want stats — all
// on the same page. Sharing one in-flight promise per dataVersion collapses
// those into a single getUserStats round-trip.

import type { UserStats } from "@/lib/types";
import { getUserStats } from "./actions";

let cached: { version: number; promise: Promise<UserStats> } | null = null;

/** Shared getUserStats for a given dataVersion — one fetch per version, reused
 *  by every caller until the next `bumpDataVersion()`. */
export function fetchUserStatsShared(version: number): Promise<UserStats> {
  if (!cached || cached.version !== version) {
    cached = { version, promise: getUserStats() };
  }
  return cached.promise;
}
