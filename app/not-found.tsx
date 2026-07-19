import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-20 text-center">
      <p className="text-4xl font-bold tracking-tight text-muted-foreground">404</p>
      <div>
        <h1 className="text-lg font-bold">Not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This page doesn&rsquo;t exist, or the course isn&rsquo;t in your library.
        </p>
      </div>
      <Button size="sm" nativeButton={false} render={<Link href="/" />}>
        <Compass className="size-4" aria-hidden />
        Back to My Learning
      </Button>
    </div>
  );
}
