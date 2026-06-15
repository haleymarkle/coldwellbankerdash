"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth";
import { getData } from "@/lib/data";
import { ROLES } from "@/lib/rbac";
import type { Role, ToolType } from "@/lib/types";

export interface ActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

const TOOL_TYPES = ["internal_route", "external_link"] as const;

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens"),
  description: z.string().trim().min(1, "Description is required").max(500),
  icon: z.string().trim().min(1, "Icon is required").max(60),
  category: z.string().trim().min(1, "Category is required").max(80),
  type: z.enum(TOOL_TYPES),
  url: z.string().trim().min(1, "URL is required").max(500),
  sortOrder: z.coerce.number().int().min(0).max(100000),
  isActive: z.boolean(),
  roles: z.array(z.enum(ROLES as [Role, ...Role[]])).min(1, "Select at least one role"),
});

function flattenFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

function readInput(formData: FormData) {
  const roles = formData.getAll("roles").map(String) as Role[];
  return {
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    icon: formData.get("icon"),
    category: formData.get("category"),
    type: formData.get("type"),
    url: formData.get("url"),
    sortOrder: formData.get("sortOrder") ?? "100",
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
    roles,
  };
}

export async function createToolAction(
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
  const existing = await data.getToolBySlug(parsed.data.slug);
  if (existing) {
    return { ok: false, error: "A tool with that slug already exists.", fieldErrors: { slug: "Slug must be unique" } };
  }

  await data.createTool({
    name: parsed.data.name,
    slug: parsed.data.slug,
    description: parsed.data.description,
    icon: parsed.data.icon,
    category: parsed.data.category,
    type: parsed.data.type as ToolType,
    url: parsed.data.url,
    sortOrder: parsed.data.sortOrder,
    isActive: parsed.data.isActive,
    roles: parsed.data.roles,
  });

  revalidatePath("/admin/tools");
  return { ok: true };
}

export async function updateToolAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { allowed } = await requireRole("high_level_user");
  if (!allowed) return { ok: false, error: "You do not have permission to do this." };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Missing tool id." };

  const parsed = schema.safeParse(readInput(formData));
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: flattenFieldErrors(parsed.error) };
  }

  const data = await getData();
  const bySlug = await data.getToolBySlug(parsed.data.slug);
  if (bySlug && bySlug.id !== id) {
    return { ok: false, error: "A tool with that slug already exists.", fieldErrors: { slug: "Slug must be unique" } };
  }

  const updated = await data.updateTool(id, {
    name: parsed.data.name,
    slug: parsed.data.slug,
    description: parsed.data.description,
    icon: parsed.data.icon,
    category: parsed.data.category,
    type: parsed.data.type as ToolType,
    url: parsed.data.url,
    sortOrder: parsed.data.sortOrder,
    isActive: parsed.data.isActive,
    roles: parsed.data.roles,
  });
  if (!updated) return { ok: false, error: "Tool not found." };

  revalidatePath("/admin/tools");
  return { ok: true };
}

export async function deleteToolAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { allowed } = await requireRole("high_level_user");
  if (!allowed) return { ok: false, error: "You do not have permission to do this." };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Missing tool id." };

  const data = await getData();
  await data.deleteTool(id);

  revalidatePath("/admin/tools");
  return { ok: true };
}
