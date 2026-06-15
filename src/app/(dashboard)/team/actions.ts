"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth";
import { getData } from "@/lib/data";

export interface TeamActionResult {
  ok: boolean;
  error?: string;
}

const idSchema = z.object({
  profileId: z.string().min(1, "Missing profile."),
  trainingId: z.string().min(1, "Missing training."),
});

/**
 * Re-checks authorization server-side and confirms the target profile belongs
 * to the acting manager's office (master_admin bypasses the office scope).
 * Returns the resolved profile when access is granted, or an error string.
 */
async function authorizeForProfile(
  profileId: string
): Promise<{ error: string } | { error?: undefined }> {
  const { user, allowed } = await requireRole("office_manager");
  if (!allowed) {
    return { error: "You don't have access to manage this office." };
  }

  const data = await getData();
  const profile = await data.getProfileById(profileId);
  if (!profile) {
    return { error: "That agent could not be found." };
  }

  // master_admin may act across offices; everyone else is scoped to their own.
  if (user.role !== "master_admin") {
    if (!user.officeId || profile.officeId !== user.officeId) {
      return { error: "That agent isn't in your office." };
    }
  }

  return {};
}

/** Assign a training to an agent in the manager's office. */
export async function assignTrainingToProfile(
  profileId: string,
  trainingId: string
): Promise<TeamActionResult> {
  const parsed = idSchema.safeParse({ profileId, trainingId });
  if (!parsed.success) {
    return { ok: false, error: "Pick a training to assign." };
  }

  const auth = await authorizeForProfile(parsed.data.profileId);
  if (auth.error) return { ok: false, error: auth.error };

  const data = await getData();
  const training = await data.getTrainingById(parsed.data.trainingId);
  if (!training) {
    return { ok: false, error: "That training no longer exists." };
  }

  await data.assignTraining(parsed.data.profileId, parsed.data.trainingId);
  revalidatePath("/team");
  return { ok: true };
}

/** Remove a training assignment from an agent in the manager's office. */
export async function removeTrainingFromProfile(
  profileId: string,
  trainingId: string
): Promise<TeamActionResult> {
  const parsed = idSchema.safeParse({ profileId, trainingId });
  if (!parsed.success) {
    return { ok: false, error: "Missing assignment details." };
  }

  const auth = await authorizeForProfile(parsed.data.profileId);
  if (auth.error) return { ok: false, error: auth.error };

  const data = await getData();
  await data.unassignTraining(parsed.data.profileId, parsed.data.trainingId);
  revalidatePath("/team");
  return { ok: true };
}
