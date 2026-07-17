"use client";

import { useState } from "react";
import { Flame, Loader2, MailCheck } from "lucide-react";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MagicLinkStatus = "idle" | "sending" | "sent" | "error";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.93-2.91l-3.87-3c-1.07.72-2.45 1.14-4.06 1.14-3.12 0-5.77-2.11-6.71-4.95H1.29v3.1A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.28A7.2 7.2 0 0 1 4.91 12c0-.79.14-1.56.38-2.28v-3.1H1.29a12 12 0 0 0 0 10.76l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0A11.99 11.99 0 0 0 1.29 6.62l4 3.1C6.23 6.88 8.88 4.77 12 4.77Z"
      />
    </svg>
  );
}

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<MagicLinkStatus>("idle");
  const [googlePending, setGooglePending] = useState(false);

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    const { error } = await signIn.magicLink({ email: email.trim(), callbackURL: "/" });
    setStatus(error ? "error" : "sent");
  };

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-6 pt-10">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-brand/10">
          <Flame className="size-6 text-brand" aria-hidden />
        </span>
        <h1 className="text-2xl font-bold tracking-tight">Welcome to Ember</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to keep your streaks, XP, and courses in sync everywhere.
        </p>
      </div>

      <Card className="w-full">
        <CardContent className="space-y-4 p-6">
          <Button
            className="w-full"
            variant="outline"
            disabled={googlePending}
            onClick={async () => {
              setGooglePending(true);
              await signIn.social({ provider: "google", callbackURL: "/" });
            }}
          >
            {googlePending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <GoogleIcon />}
            Continue with Google
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {status === "sent" ? (
            <div className="flex flex-col items-center gap-2 py-2 text-center">
              <MailCheck className="size-5 text-brand" aria-hidden />
              <p className="text-sm font-medium">Check your inbox</p>
              <p className="text-xs text-muted-foreground">
                We sent a sign-in link to {email.trim()}. It expires in 5 minutes.
              </p>
              <Button variant="ghost" size="sm" onClick={() => setStatus("idle")}>
                Use a different email
              </Button>
            </div>
          ) : (
            <form className="space-y-3" onSubmit={sendMagicLink}>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={status === "sending"}>
                {status === "sending" && <Loader2 className="size-4 animate-spin" aria-hidden />}
                Email me a sign-in link
              </Button>
              {status === "error" && (
                <p className="text-xs text-destructive">
                  Couldn&apos;t send the link — try Google, or try again in a moment.
                </p>
              )}
            </form>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        No passwords. We&apos;ll create your account on first sign-in.
      </p>
    </div>
  );
}
