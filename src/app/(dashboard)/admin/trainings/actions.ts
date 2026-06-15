"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth";
import { getData } from "@/lib/data";
import { ROLES } from "@/lib/rbac";
import type { Role } from "@/lib/types";

export interface ActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

const schema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().min(1, "Description is required").max(500),
  content: z.string().trim().max(20000).optional(),
  url: z.string().trim().max(500).optional(),
  category: z.string().trim().min(1, "Category is required").max(80),
  estimatedMinutes: z
    .union([z.coerce.number().int().min(0).max(100000), z.nan()])
    .optional(),
  isActive: z.boolean(),
  requiredForRoles: z.array(z.enum(ROLES as [Role, ...Role[]])),
});

function emptyToNull(v: string | undefined): string | null {
  const t = v?.trim();
  return t ? t : null;
}

function flattenFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

function readInput(formData: FormData) {
  const requiredForRoles = formData.getAll("requiredForRoles").map(String) as Role[];
  const minutesRaw = String(formData.get("estimatedMinutes") ?? "").trim();
  return {
    title: formData.get("title"),
    description: formData.get("description"),
    content: formData.get("content") ?? undefined,
    url: formData.get("url") ?? undefined,
    category: formData.get("category"),
    estimatedMinutes: minutesRaw === "" ? undefined : Number(minutesRaw),
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
    requiredForRoles,
  };
}

function normalizeMinutes(v: number | undefined): number | null {
  if (v === undefined || Number.isNaN(v)) return null;
  return v;
}

export async function createTrainingAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { allowed } = await requireRole("high_level_user");
  if (!allowed) return { ok: false, error: "You do not have permission to do this." };

  const parsed = schema.safeParse(readInput(formData));
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: flattenFieldErrors(parsed.error) };
  }

  const data = await getData();
  await data.createTraining({
    title: parsed.data.title,
    description: parsed.data.description,
    content: emptyToNull(parsed.data.content),
    url: emptyToNull(parsed.data.url),
    category: parsed.data.category,
    estimatedMinutes: normalizeMinutes(parsed.data.estimatedMinutes),
    isActive: parsed.data.isActive,
    requiredForRoles: parsed.data.requiredForRoles,
  });

  revalidatePath("/admin/trainings");
  return { ok: true };
}

export async function updateTrainingAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { allowed } = await requireRole("high_level_user");
  if (!allowed) return { ok: false, error: "You do not have permission to do this." };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Missing training id." };

  const parsed = schema.safeParse(readInput(formData));
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: flattenFieldErrors(parsed.error) };
  }

  const data = await getData();
  const updated = await data.updateTraining(id, {
    title: parsed.data.title,
    description: parsed.data.description,
    content: emptyToNull(parsed.data.content),
    url: emptyToNull(parsed.data.url),
    category: parsed.data.category,
    estimatedMinutes: normalizeMinutes(parsed.data.estimatedMinutes),
    isActive: parsed.data.isActive,
    requiredForRoles: parsed.data.requiredForRoles,
  });
  if (!updated) return { ok: false, error: "Training not found." };

  revalidatePath("/admin/trainings");
  return { ok: true };
}

export async function deleteTrainingAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { allowed } = await requireRole("high_level_user");
  if (!allowed) return { ok: false, error: "You do not have permission to do this." };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Missing training id." };

  const data = await getData();
  await data.deleteTraining(id);

  revalidatePath("/admin/trainings");
  return { ok: true };
}
