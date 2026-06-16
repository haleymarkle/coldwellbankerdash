// DEV auth stub. Active when NEON_AUTH_COOKIE_SECRET is unset, so the app runs
// locally with zero credentials. Sign-in sets a session cookie with the real
// userId from the DB profile matched by email. NEVER used in prod.

import { cookies } from "next/headers";
import type { Role } from "@/lib/types";
import { ROLES } from "@/lib/rbac";

export const DEV_SESSION_COOKIE = "cb_dev_session";
export const DEV_ROLE_COOKIE = "cb_dev_role";
export const DEV_USER_ID_COOKIE = "cb_dev_user_id";

function isRole(value: string | undefined): value is Role {
  return value != null && (ROLES as string[]).includes(value);
}

export async function getDevRole(): Promise<Role> {
  const jar = await cookies();
  const raw = jar.get(DEV_ROLE_COOKIE)?.value;
  return isRole(raw) ? raw : "master_admin";
}

export async function getDevSession(): Promise<{ userId: string } | null> {
  const jar = await cookies();
  if (!jar.get(DEV_SESSION_COOKIE)) return null;
  const userId = jar.get(DEV_USER_ID_COOKIE)?.value;
  if (!userId) return null;
  return { userId };
}
