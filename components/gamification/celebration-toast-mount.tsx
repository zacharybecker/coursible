"use client";

// Keeps framer-motion out of the shared/root bundle. The toast (and its
// framer-motion dependency) is only fetched after the first celebration, so
// every route that never triggers one never pays for the animation library.

import dynamic from "next/dynamic";
import { useAppStore } from "@/lib/store/app-store";

const CelebrationToast = dynamic(
  () => import("./celebration-toast").then((m) => m.CelebrationToast),
  { ssr: false },
);

export function CelebrationToastMount() {
  // Latches true on the first celebration and never resets, so once mounted
  // the toast stays put and can play its own exit animation on dismiss.
  const shown = useAppStore((s) => s.hasCelebratedEver);
  return shown ? <CelebrationToast /> : null;
}
