"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Flame, GraduationCap, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { HeaderStats } from "./header-stats";

const NAV_ITEMS = [
  { href: "/", label: "Learn", icon: GraduationCap },
  { href: "/catalog", label: "Catalog", icon: Compass },
  { href: "/create", label: "Create", icon: Sparkles },
  { href: "/profile", label: "Profile", icon: User },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/" || pathname.startsWith("/courses");
  return pathname.startsWith(href);
}

/** Desktop top bar. */
export function TopNav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 hidden border-b bg-background/80 backdrop-blur md:block">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-1.5 text-lg font-bold tracking-tight">
            <Flame className="size-5 text-brand" aria-hidden />
            Ember
          </Link>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive(pathname, href)
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <HeaderStats />
      </div>
    </header>
  );
}

/** Mobile: slim top brand bar + bottom tab bar. */
export function MobileNav() {
  const pathname = usePathname();
  return (
    <>
      <header className="sticky top-0 z-40 flex h-12 items-center justify-between border-b bg-background/80 px-4 backdrop-blur md:hidden">
        <Link href="/" className="flex items-center gap-1.5 font-bold tracking-tight">
          <Flame className="size-5 text-brand" aria-hidden />
          Ember
        </Link>
        <HeaderStats />
      </header>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Primary"
      >
        <div className="grid grid-cols-4">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
                  active ? "text-brand-strong" : "text-muted-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className={cn("size-5", active && "text-brand")} aria-hidden />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
