// Auth interface used everywhere in the app. Selects the dev stub or Neon Auth
// (Better Auth) at runtime by environment, so call sites never change.

import "server-only";
import { redirect } from "next/navigation";
import type { CurrentUser, Role } from "@/lib/types";
import { hasAtLeast } from "@/lib/rbac";
import { getData } from "@/lib/data";
import { getDevSession } from "./dev-stub";

/** True when Neon Auth (Better Auth) is configured (production path). */
export function isAuthConfigured(): boolean {
  return Boolean(process.env.NEON_AUTH_BASE_URL);
}

interface AuthSession {
  userId: string;
}

/** The raw authenticated session (or null). */
export async function getSession(): Promise<AuthSession | null> {
  if (!isAuthConfigured()) return getDevSession();
  const { getNeonSession } = await import("./neon");
  return getNeonSession();
}

/** The authenticated user resolved against their profile + office, or null. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  if (!session) return null;

  const data = await getData();
  const profile = await data.getProfileByUserId(session.userId);
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

/** Require an authenticated user; redirect to sign-in otherwise. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
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
