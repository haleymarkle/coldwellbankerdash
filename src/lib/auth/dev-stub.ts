// DEV auth stub. Active when NEON_AUTH_BASE_URL is unset, so the app runs locally
// with zero credentials. "Signing in" sets a session cookie; the Dev Role Switcher
// sets `dev_role` so you can view the app as any of the 4 roles. NEVER used in prod.

import { cookies } from "next/headers";
import type { Role } from "@/lib/types";
import { ROLES } from "@/lib/rbac";
import { DEV_USER_IDS } from "@/lib/data/seed-data";

export const DEV_SESSION_COOKIE = "cb_dev_session";
export const DEV_ROLE_COOKIE = "cb_dev_role";

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
  const role = await getDevRole();
  return { userId: DEV_USER_IDS[role] };
}
