"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth";
import { getData } from "@/lib/data";
import { assignableRoles } from "@/lib/rbac";
import { ROLES } from "@/lib/rbac";
import type { Role, UserStatus } from "@/lib/types";

export interface ActionState {
  ok: boolean;
  error?: string;
  /** Field-level validation messages keyed by field name. */
  fieldErrors?: Record<string, string>;
}

const USER_STATUSES = ["active", "invited", "disabled"] as const;

const baseSchema = z.object({
  displayName: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  role: z.enum(ROLES as [Role, ...Role[]]),
  status: z.enum(USER_STATUSES),
  officeId: z.string().trim().optional(),
  title: z.string().trim().max(120).optional(),
});

function emptyToNull(v: string | undefined): string | null {
  const t = v?.trim();
  return t ? t : null;
}

function flattenFieldErrors(
  error: z.ZodError
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Ensure the actor may assign the given target role (cannot grant above self). */
function assertAssignable(actorRole: Role, targetRole: Role): string | null {
  if (!assignableRoles(actorRole).includes(targetRole)) {
    return "You cannot assign a role higher than your own.";
  }
  return null;
}

export async function createUserAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { user, allowed } = await requireRole("high_level_user");
  if (!allowed) return { ok: false, error: "You do not have permission to do this." };

  const parsed = baseSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    role: formData.get("role"),
    status: formData.get("status"),
    officeId: formData.get("officeId") ?? undefined,
    title: formData.get("title") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: flattenFieldErrors(parsed.error) };
  }

  const roleError = assertAssignable(user.role, parsed.data.role);
  if (roleError) return { ok: false, error: roleError, fieldErrors: { role: roleError } };

  const data = await getData();
  await data.createProfile({
    displayName: parsed.data.displayName,
    email: parsed.data.email,
    role: parsed.data.role,
    status: parsed.data.status as UserStatus,
    officeId: emptyToNull(parsed.data.officeId),
    title: emptyToNull(parsed.data.title),
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function updateUserAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { user, allowed } = await requireRole("high_level_user");
  if (!allowed) return { ok: false, error: "You do not have permission to do this." };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Missing user id." };

  const parsed = baseSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    role: formData.get("role"),
    status: formData.get("status"),
    officeId: formData.get("officeId") ?? undefined,
    title: formData.get("title") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: flattenFieldErrors(parsed.error) };
  }

  const roleError = assertAssignable(user.role, parsed.data.role);
  if (roleError) return { ok: false, error: roleError, fieldErrors: { role: roleError } };

  const data = await getData();
  const updated = await data.updateProfile(id, {
    displayName: parsed.data.displayName,
    email: parsed.data.email,
    role: parsed.data.role,
    status: parsed.data.status as UserStatus,
    officeId: emptyToNull(parsed.data.officeId),
    title: emptyToNull(parsed.data.title),
  });
  if (!updated) return { ok: false, error: "User not found." };

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function deleteUserAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { user, allowed } = await requireRole("high_level_user");
  if (!allowed) return { ok: false, error: "You do not have permission to do this." };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Missing user id." };

  const data = await getData();
  const target = await data.getProfileById(id);
  if (!target) return { ok: false, error: "User not found." };

  // Don't allow deleting yourself, and don't allow deleting someone above your rank.
  if (target.id === user.id) {
    return { ok: false, error: "You cannot delete your own account." };
  }
  if (!assignableRoles(user.role).includes(target.role)) {
    return { ok: false, error: "You cannot delete a user with a higher role than your own." };
  }

  await data.deleteProfile(id);
  revalidatePath("/admin/users");
  return { ok: true };
}
