"use client";

// Segment error boundary: catches render/throw errors anywhere under the root
// layout and shows a recoverable UI instead of Next's opaque digest screen.

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-20 text-center">
      <TriangleAlert className="size-8 text-destructive" aria-hidden />
      <div>
        <h1 className="text-lg font-bold">Something went wrong</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This page hit an unexpected error. You can try again.
        </p>
      </div>
      <Button size="sm" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
