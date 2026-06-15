// Role-based access control: the single source of truth for the 4-tier hierarchy.
// Visibility (sidebar/nav) may use these on the client, but every server action
// and protected page MUST re-check server-side — never trust the client.

import type { CurrentUser, Role, Tool } from "@/lib/types";

export const ROLES: Role[] = [
  "master_admin",
  "high_level_user",
  "office_manager",
  "agent",
];

/** Numeric rank for hierarchy comparisons (higher = more privileged). */
export const ROLE_RANK: Record<Role, number> = {
  master_admin: 4,
  high_level_user: 3,
  office_manager: 2,
  agent: 1,
};

export const ROLE_LABELS: Record<Role, string> = {
  master_admin: "Master Admin",
  high_level_user: "Leadership",
  office_manager: "Office Manager",
  agent: "Agent",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  master_admin: "Full control of the platform, all offices, users, and settings.",
  high_level_user: "Org-wide visibility; manages tools and trainings across offices.",
  office_manager: "Manages agents, trainings, and access within their office.",
  agent: "Uses granted tools and completes assigned trainings.",
};

/** True when `role` is at least as privileged as `min`. */
export function hasAtLeast(role: Role, min: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

/** Roles that can reach the org-wide admin area. */
export function canAccessAdmin(role: Role): boolean {
  return hasAtLeast(role, "high_level_user");
}

/** Roles that manage their own office (the "/team" area). */
export function canManageOffice(role: Role): boolean {
  return hasAtLeast(role, "office_manager");
}

/**
 * Resolve whether a user can access a tool.
 * Precedence: master_admin bypass → tool active → role match → office scope.
 * (Per-user grant/deny overrides are applied in the data layer before this.)
 */
export function canAccessTool(
  user: Pick<CurrentUser, "role" | "officeId">,
  tool: Tool
): boolean {
  if (user.role === "master_admin") return true;
  if (!tool.isActive) return false;
  if (!tool.roles.includes(user.role)) return false;
  if (tool.officeIds && tool.officeIds.length > 0) {
    return user.officeId != null && tool.officeIds.includes(user.officeId);
  }
  return true;
}

/** Roles a given user is allowed to assign to others (cannot grant above self). */
export function assignableRoles(actorRole: Role): Role[] {
  return ROLES.filter((r) => ROLE_RANK[r] <= ROLE_RANK[actorRole]);
}
