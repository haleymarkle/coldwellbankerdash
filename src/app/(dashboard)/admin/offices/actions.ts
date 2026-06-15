"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth";
import { getData } from "@/lib/data";

export interface ActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
  addressLine1: z.string().trim().max(200).optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(60).optional(),
  postalCode: z.string().trim().max(20).optional(),
  region: z.string().trim().max(120).optional(),
  isActive: z.boolean(),
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
  return {
    name: formData.get("name"),
    addressLine1: formData.get("addressLine1") ?? undefined,
    city: formData.get("city") ?? undefined,
    state: formData.get("state") ?? undefined,
    postalCode: formData.get("postalCode") ?? undefined,
    region: formData.get("region") ?? undefined,
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  };
}

export async function createOfficeAction(
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
  await data.createOffice({
    name: parsed.data.name,
    addressLine1: emptyToNull(parsed.data.addressLine1),
    city: emptyToNull(parsed.data.city),
    state: emptyToNull(parsed.data.state),
    postalCode: emptyToNull(parsed.data.postalCode),
    region: emptyToNull(parsed.data.region),
    isActive: parsed.data.isActive,
  });

  revalidatePath("/admin/offices");
  return { ok: true };
}

export async function updateOfficeAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { allowed } = await requireRole("high_level_user");
  if (!allowed) return { ok: false, error: "You do not have permission to do this." };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Missing office id." };

  const parsed = schema.safeParse(readInput(formData));
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: flattenFieldErrors(parsed.error) };
  }

  const data = await getData();
  const updated = await data.updateOffice(id, {
    name: parsed.data.name,
    addressLine1: emptyToNull(parsed.data.addressLine1),
    city: emptyToNull(parsed.data.city),
    state: emptyToNull(parsed.data.state),
    postalCode: emptyToNull(parsed.data.postalCode),
    region: emptyToNull(parsed.data.region),
    isActive: parsed.data.isActive,
  });
  if (!updated) return { ok: false, error: "Office not found." };

  revalidatePath("/admin/offices");
  return { ok: true };
}

export async function deleteOfficeAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { allowed } = await requireRole("high_level_user");
  if (!allowed) return { ok: false, error: "You do not have permission to do this." };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Missing office id." };

  const data = await getData();
  const office = await data.getOffice(id);
  if (!office) return { ok: false, error: "Office not found." };

  await data.deleteOffice(id);
  revalidatePath("/admin/offices");
  return { ok: true };
}
