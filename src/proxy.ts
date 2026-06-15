// Next.js 16 renames `middleware.ts` -> `proxy.ts` (Node runtime).
// Coarse auth gate only: is there a session? The real authorization (roles) is
// enforced server-side in layouts + every server action. Defense in depth.
//
// - PROD (NEON_AUTH_BASE_URL set): delegate to Neon Auth (Better Auth) middleware.
// - DEV: light cookie-presence check, redirect to /sign-in when absent.

import { NextResponse, type NextRequest } from "next/server";
import { DEV_SESSION_COOKIE } from "@/lib/auth/dev-stub";

export default async function proxy(request: NextRequest) {
  if (process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET) {
    const { getAuth } = await import("@/lib/auth/neon");
    return getAuth().middleware({ loginUrl: "/sign-in" })(request);
  }

  // DEV gate
  const hasSession = Boolean(request.cookies.get(DEV_SESSION_COOKIE));
  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Run on app routes only — exclude the auth API, sign-in, Next internals,
  // and any path with a file extension (static assets).
  matcher: ["/((?!api/auth|sign-in|handler|_next|.*\\..*).*)"],
};
