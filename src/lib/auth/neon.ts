// PRODUCTION auth — Neon Auth (Better Auth). The auth instance is created LAZILY
// (only when first used) so importing this module never throws at build time when
// the env vars are absent (dev). `createNeonAuth` validates cookies.secret eagerly,
// hence the getter.
//
// Wire at deploy: enable Neon Auth (Better Auth) on your project's default branch,
// copy the Auth URL, and set NEON_AUTH_BASE_URL + NEON_AUTH_COOKIE_SECRET
// (>= 32 chars, e.g. `openssl rand -base64 32`).

import { createNeonAuth } from "@neondatabase/neon-js/auth/next/server";

let _auth: ReturnType<typeof createNeonAuth> | null = null;

/** Lazily construct (and cache) the Neon Auth instance. */
export function getAuth() {
  if (!_auth) {
    const baseUrl = process.env.NEON_AUTH_BASE_URL;
    const secret = process.env.NEON_AUTH_COOKIE_SECRET;
    if (!baseUrl || !secret) {
      throw new Error(
        "NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET must both be set to use Neon Auth."
      );
    }
    // Google OAuth is handled by Neon's shared credentials at the hosted auth
    // layer — no GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET needed in the app.
    _auth = createNeonAuth({
      baseUrl,
      cookies: {
        secret,
        // OAuth returns from Google → Neon's hosted auth → back to this app as a
        // cross-site, top-level navigation. The lib's default SameSite=Strict drops
        // the OAuth `session_challange` cookie on that return, so the verifier
        // exchange never runs and sign-in bounces back to /sign-in. `lax` is sent on
        // top-level cross-site GETs — exactly the OAuth return — and was the lib's
        // previous hard-coded default. Required for Google sign-in to work.
        sameSite: "lax",
      },
    });
  }
  return _auth;
}

export async function getNeonSession(): Promise<{ userId: string } | null> {
  const { data: session } = await getAuth().getSession();
  if (!session?.user) return null;
  return { userId: session.user.id };
}

export async function getNeonUser(
  userId: string
): Promise<{ email: string; name: string | null } | null> {
  const { data: session } = await getAuth().getSession();
  if (!session?.user || session.user.id !== userId) return null;
  return {
    email: session.user.email,
    name: session.user.name ?? null,
  };
}
