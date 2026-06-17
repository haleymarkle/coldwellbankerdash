// Auth interface used everywhere in the app. Selects the dev stub or Neon Auth
// (Better Auth) at runtime by environment, so call sites never change.

import "server-only";
import { redirect } from "next/navigation";
import type { CurrentUser, Role } from "@/lib/types";
import { hasAtLeast } from "@/lib/rbac";
import { getData } from "@/lib/data";
import { getDevSession } from "./dev-stub";

/** The bootstrap master-admin email, auto-signed-in during local dev. */
export const MASTER_ADMIN_EMAIL = "haleymarkle@gmail.com";

/** True when Neon Auth (Better Auth) is fully configured (production path). */
export function isAuthConfigured(): boolean {
  return Boolean(process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET);
}

/**
 * True when we should skip login entirely and auto-sign-in as the master admin.
 * Active only outside production (i.e. `npm run dev` here / locally), so the
 * dashboard is editable without auth. Every deployment runs NODE_ENV=production
 * and is therefore fully gated. Set DEV_AUTH_BYPASS=false to test real auth in dev.
 */
export function isDevAuthBypass(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_AUTH_BYPASS !== "false"
  );
}

interface AuthSession {
  userId: string;
}

/** The raw authenticated session (or null). */
export async function getSession(): Promise<AuthSession | null> {
  if (isDevAuthBypass()) {
    // Dev: resolve the master-admin profile straight from the DB, no login.
    const data = await getData();
    const profile = await data.getProfileByEmail(MASTER_ADMIN_EMAIL);
    return profile ? { userId: profile.userId } : null;
  }
  if (!isAuthConfigured()) return getDevSession();
  const { getNeonSession } = await import("./neon");
  return getNeonSession();
}

/** The authenticated user resolved against their profile + office, or null. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  if (!session) return null;

  const data = await getData();
  let profile = await data.getProfileByUserId(session.userId);

  // First-time Google sign-in: no profile yet. Auto-create a pending one.
  // haleymarkle@gmail.com is always bootstrapped as master_admin.
  if (!profile) {
    const neonUser = isAuthConfigured()
      ? await (async () => {
          const { getNeonUser } = await import("./neon");
          return getNeonUser(session.userId);
        })()
      : null;
    if (neonUser?.email) {
      const isMasterAdmin =
        neonUser.email.toLowerCase() === "haleymarkle@gmail.com";
      try {
        profile = await data.createProfile({
          userId: session.userId,
          email: neonUser.email,
          displayName: neonUser.name ?? neonUser.email,
          role: isMasterAdmin ? "master_admin" : "agent",
          status: isMasterAdmin ? "active" : "invited",
        });
      } catch (err) {
        // On first sign-in the dashboard layout + RSC segments call this
        // concurrently; each sees "no profile" and races to INSERT. The unique
        // user_id constraint rejects all but the winner — re-fetch the row the
        // winner created instead of crashing. Re-throw if it was a real failure.
        profile = await data.getProfileByUserId(session.userId);
        if (!profile) throw err;
      }
    }
  }

  if (!profile || profile.status === "disabled") return null;

  return {
    id: profile.id,
    userId: profile.userId,
    email: profile.email,
    name: profile.displayName,
    role: profile.role,
    status: profile.status,
    officeId: profile.officeId,
    officeName: profile.officeId ? await officeNameFor(profile.officeId) : null,
    title: profile.title ?? null,
    avatarUrl: profile.avatarUrl ?? null,
  };
}

async function officeNameFor(officeId: string): Promise<string | null> {
  const data = await getData();
  const office = await data.getOffice(officeId);
  return office?.name ?? null;
}

/** Require an authenticated user; redirect to sign-in (or /pending if awaiting approval). */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.status === "invited") redirect("/pending");
  return user;
}

/**
 * Require an authenticated user with at least `min` rank.
 * Returns { user, allowed } so layouts can render a Forbidden view instead of
 * a hard redirect. Server actions should check `allowed` and refuse if false.
 */
export async function requireRole(
  min: Role
): Promise<{ user: CurrentUser; allowed: boolean }> {
  const user = await requireUser();
  return { user, allowed: hasAtLeast(user.role, min) };
}
