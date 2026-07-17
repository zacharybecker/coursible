// Optimistic auth gate (Next 16 renamed `middleware` to `proxy`): a fast
// session-cookie presence check that redirects signed-out visitors to /signin.
// The authoritative check lives in requireUser() inside every Server Action —
// this only exists so signed-out users never see a broken shell.

import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;
  const onSignin = pathname === "/signin";

  if (!sessionCookie && !onSignin) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }
  if (sessionCookie && onSignin) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Everything except the auth API, Next internals, and static assets.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
