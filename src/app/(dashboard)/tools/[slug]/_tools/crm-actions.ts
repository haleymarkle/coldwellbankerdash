"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { canManageOffice } from "@/lib/rbac";
import {
  getCrmData,
  type ActivityInput,
  type ContactInput,
} from "@/lib/crm/data";
import type { Contact, ContactActivity } from "@/lib/crm/types";

export interface MutationResult<T> {
  ok: boolean;
  error?: string;
  data?: T;
}

const CRM_PATH = "/tools/crm";

const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Valid date is required")
  .nullable()
  .optional();

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Enter a valid email").max(200).or(z.literal("")).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  type: z.enum([
    "buyer_lead",
    "seller_lead",
    "active_client",
    "past_client",
    "referral_sphere",
  ]),
  stage: z
    .enum(["new", "working", "under_contract", "closed", "past_client"])
    .nullable()
    .optional(),
  source: z.enum([
    "office_call",
    "soi",
    "redfin",
    "zillow_realtor",
    "website",
    "referral",
    "cb_corporate",
    "other",
  ]),
  nextAction: z.string().trim().max(300).nullable().optional(),
  nextActionDate: optionalDate,
});

const activitySchema = z.object({
  contactId: z.string().trim().min(1, "Missing contact"),
  note: z.string().trim().max(2000).optional(),
  nextAction: z.string().trim().max(300).nullable().optional(),
  nextActionDate: optionalDate,
});

/**
 * Confirm the current user may act on a given contact. Agents may only touch
 * their own; office managers and above may touch any. Returns the contact or an
 * error result.
 */
async function authorizeContact(
  contactId: string
): Promise<{ contact: Contact } | { error: string }> {
  const user = await requireUser();
  const crm = await getCrmData();
  const contact = await crm.getContact(contactId);
  if (!contact) return { error: "Contact not found." };
  const canSeeAll = canManageOffice(user.role);
  if (!canSeeAll && contact.ownerAgentId !== user.id) {
    return { error: "You don't have access to this contact." };
  }
  return { contact };
}

export async function createContactAction(
  input: ContactInput
): Promise<MutationResult<Contact>> {
  const user = await requireUser();
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid contact." };
  }
  const crm = await getCrmData();
  // Agents always own what they create. Managers may assign to another agent,
  // but default to themselves when no owner is provided.
  const canSeeAll = canManageOffice(user.role);
  const ownerAgentId =
    canSeeAll && input.ownerAgentId ? input.ownerAgentId : user.id;
  const contact = await crm.createContact({
    ...parsed.data,
    email: parsed.data.email || null,
    ownerAgentId,
  } as ContactInput);
  revalidatePath(CRM_PATH);
  return { ok: true, data: contact };
}

export async function updateContactAction(
  id: string,
  input: Partial<ContactInput>
): Promise<MutationResult<Contact>> {
  if (!id) return { ok: false, error: "Missing contact id." };
  const auth = await authorizeContact(id);
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = contactSchema.partial().safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid contact." };
  }
  const crm = await getCrmData();
  // Never allow re-assigning ownership through this action.
  const { ...patch } = parsed.data;
  const contact = await crm.updateContact(id, {
    ...patch,
    email: patch.email === "" ? null : patch.email,
  } as Partial<ContactInput>);
  if (!contact) return { ok: false, error: "Contact not found." };
  revalidatePath(CRM_PATH);
  return { ok: true, data: contact };
}

export async function deleteContactAction(
  id: string
): Promise<MutationResult<null>> {
  if (!id) return { ok: false, error: "Missing contact id." };
  const auth = await authorizeContact(id);
  if ("error" in auth) return { ok: false, error: auth.error };
  const crm = await getCrmData();
  await crm.deleteContact(id);
  revalidatePath(CRM_PATH);
  return { ok: true, data: null };
}

/**
 * Log a follow-up as done: records an activity entry and updates the contact's
 * next action + date (passing null/empty clears the follow-up).
 */
export async function completeFollowUpAction(input: {
  contactId: string;
  note?: string;
  nextAction?: string | null;
  nextActionDate?: string | null;
}): Promise<MutationResult<{ contact: Contact; activity: ContactActivity }>> {
  const user = await requireUser();
  const parsed = activitySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid follow-up." };
  }
  const auth = await authorizeContact(parsed.data.contactId);
  if ("error" in auth) return { ok: false, error: auth.error };

  const crm = await getCrmData();
  const today = new Date().toISOString().slice(0, 10);
  const note =
    parsed.data.note?.trim() ||
    `Completed follow-up: ${auth.contact.nextAction ?? "touch base"}`;

  const activity = await crm.addActivity({
    contactId: parsed.data.contactId,
    date: today,
    note,
    author: user.name,
  } satisfies ActivityInput);

  const contact = await crm.updateContact(parsed.data.contactId, {
    nextAction: parsed.data.nextAction ?? null,
    nextActionDate: parsed.data.nextActionDate ?? null,
  });
  revalidatePath(CRM_PATH);
  if (!contact) return { ok: false, error: "Contact not found." };
  return { ok: true, data: { contact, activity } };
}

/** Add a free-form note to a contact's activity history. */
export async function addNoteAction(input: {
  contactId: string;
  note: string;
}): Promise<MutationResult<ContactActivity>> {
  const user = await requireUser();
  const note = input.note?.trim();
  if (!note) return { ok: false, error: "Note can't be empty." };
  const auth = await authorizeContact(input.contactId);
  if ("error" in auth) return { ok: false, error: auth.error };
  const crm = await getCrmData();
  const activity = await crm.addActivity({
    contactId: input.contactId,
    date: new Date().toISOString().slice(0, 10),
    note,
    author: user.name,
  });
  revalidatePath(CRM_PATH);
  return { ok: true, data: activity };
}

/** Move a contact to a pipeline stage (used by the board). */
export async function setStageAction(
  id: string,
  stage: Contact["stage"]
): Promise<MutationResult<Contact>> {
  return updateContactAction(id, { stage });
}
