"use client";

import { Button } from "./button";

/** Inline "something failed — retry" state for client pages that load data in
 *  an effect (a rejected fetch would otherwise leave the page blank forever). */
export function InlineError({
  message = "Something went wrong loading this page.",
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button size="sm" variant="outline" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
