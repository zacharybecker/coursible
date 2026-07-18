"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import type { MatchingPage, PageOutcome } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Tap-to-pair matching: pick a left item, then its right-column partner.
 * A wrong pick counts as a miss (and flashes); the outcome is "correct"
 * only when every pair was matched without a single miss.
 */
export function MatchingPageView({
  page,
  onComplete,
}: {
  page: MatchingPage;
  onComplete: (outcome: PageOutcome) => void;
}) {
  // Right column is shuffled once per mount; pair ids are shared across columns.
  const rightColumn = useMemo(
    () => shuffle(page.pairs.map((p) => ({ id: p.id, text: p.right }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page.id],
  );
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matched, setMatched] = useState<ReadonlySet<string>>(new Set());
  const [misses, setMisses] = useState(0);
  const [missedRightId, setMissedRightId] = useState<string | null>(null);

  const allMatched = matched.size === page.pairs.length;

  function pickLeft(id: string) {
    if (matched.has(id)) return;
    setSelectedLeft(id);
    setMissedRightId(null);
  }

  function pickRight(id: string) {
    if (!selectedLeft || matched.has(id)) return;
    if (id === selectedLeft) {
      setMatched((prev) => new Set(prev).add(id));
      setSelectedLeft(null);
      setMissedRightId(null);
    } else {
      setMisses((m) => m + 1);
      setMissedRightId(id);
    }
  }

  return (
    <div className="space-y-4">
      <p className="font-medium">{page.prompt}</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          {page.pairs.map((pair) => (
            <button
              key={pair.id}
              type="button"
              disabled={matched.has(pair.id) || allMatched}
              aria-pressed={selectedLeft === pair.id}
              onClick={() => pickLeft(pair.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg border p-3 text-left text-sm transition-colors",
                matched.has(pair.id) && "border-brand bg-brand-muted opacity-70",
                selectedLeft === pair.id && "border-brand bg-brand-muted",
                !matched.has(pair.id) && selectedLeft !== pair.id && "hover:border-brand",
              )}
            >
              {matched.has(pair.id) && (
                <CheckCircle2 className="size-4 shrink-0 text-brand-strong" aria-hidden />
              )}
              {pair.left}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {rightColumn.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={matched.has(item.id) || allMatched}
              onClick={() => pickRight(item.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg border p-3 text-left text-sm transition-colors",
                matched.has(item.id) && "border-brand bg-brand-muted opacity-70",
                missedRightId === item.id && "border-destructive bg-destructive/10",
                !matched.has(item.id) && missedRightId !== item.id && "hover:border-brand",
              )}
            >
              {matched.has(item.id) && (
                <CheckCircle2 className="size-4 shrink-0 text-brand-strong" aria-hidden />
              )}
              {item.text}
            </button>
          ))}
        </div>
      </div>

      {allMatched && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "rounded-lg border p-3 text-sm",
            misses === 0 ? "border-brand bg-brand-muted" : "border-border bg-secondary/50",
          )}
        >
          <p className="font-semibold">
            {misses === 0
              ? "All matched — first try!"
              : `All matched, with ${misses} miss${misses === 1 ? "" : "es"}.`}
          </p>
          <p className="mt-1 text-muted-foreground">{page.explanation}</p>
          <Button
            size="sm"
            className="mt-3"
            onClick={() => onComplete(misses === 0 ? "correct" : "incorrect")}
          >
            Continue
          </Button>
        </motion.div>
      )}
    </div>
  );
}
