"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { getData } from "@/lib/data";
import type { TrainingStatus } from "@/lib/types";

const VALID_STATUSES: readonly TrainingStatus[] = [
  "not_started",
  "in_progress",
  "completed",
];

export type UpdateTrainingResult =
  | { ok: true; status: TrainingStatus }
  | { ok: false; error: string };

/**
 * Update the signed-in user's progress on a training they're assigned to.
 * Re-checks auth in the action (never trust the client) and refuses if the
 * status is invalid or the training isn't assigned to this user.
 */
export async function updateMyTrainingStatus(
  trainingId: string,
  status: TrainingStatus
): Promise<UpdateTrainingResult> {
  const user = await requireUser();

  if (!VALID_STATUSES.includes(status)) {
    return { ok: false, error: "Invalid status." };
  }

  const data = await getData();
  const result = await data.setTrainingStatus(user.id, trainingId, status);
  if (!result) {
    return { ok: false, error: "This training isn't assigned to you." };
  }

  revalidatePath("/trainings");
  revalidatePath(`/trainings/${trainingId}`);
  revalidatePath("/");

  return { ok: true, status: result.status };
}
