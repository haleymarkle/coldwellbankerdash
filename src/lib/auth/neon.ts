// PRODUCTION auth — Neon Auth (Better Auth). Only imported when NEON_AUTH_BASE_URL
// is configured. Provides the shared `auth` instance used by the API route handler
// and the proxy, plus a session reader normalized to { userId }.
//
// Wire at deploy: enable Neon Auth (Better Auth) on your project's default branch,
// copy the Auth URL, and set NEON_AUTH_BASE_URL + NEON_AUTH_COOKIE_SECRET
// (>= 32 chars, e.g. `openssl rand -base64 32`).

import { createNeonAuth } from "@neondatabase/neon-js/auth/next/server";

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL ?? "",
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET ?? "",
  },
});

export async function getNeonSession(): Promise<{ userId: string } | null> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return null;
  return { userId: session.user.id };
}
