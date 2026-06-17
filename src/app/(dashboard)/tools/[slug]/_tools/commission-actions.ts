"use server";

import { z } from "zod";

import { requireUser } from "@/lib/auth";
import {
  getCommissionData,
  type AgentInput,
  type EntryInput,
} from "@/lib/commission/data";
import type {
  CommissionAgent,
  CommissionEntry,
  CommissionSettings,
  Tier,
} from "@/lib/commission/calc";

export interface MutationResult<T> {
  ok: boolean;
  error?: string;
  data?: T;
}

const tierSchema = z.object({
  threshold: z.number().nullable(),
  agentPct: z.number(),
  companyPct: z.number(),
});

const settingsSchema = z.object({
  corporatePct: z.number().min(0).max(100),
  basisIncludesCorporate: z.boolean(),
  crossingMethod: z.enum(["transaction", "threshold"]),
  tiers: z.array(tierSchema).min(1),
});

const agentSchema = z.object({
  name: z.string().trim().min(1, "Agent name is required").max(160),
  tiers: z.array(tierSchema).nullable().optional(),
});

const entrySchema = z.object({
  agentId: z.string().trim().min(1, "Agent is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Valid date is required"),
  property: z.string().trim().max(300).optional(),
  gci: z.number().min(0),
  referralType: z.enum(["percent", "flat"]),
  referralValue: z.number().min(0),
});

export async function saveSettingsAction(
  input: CommissionSettings
): Promise<MutationResult<CommissionSettings>> {
  await requireUser();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid settings." };
  }
  const data = await getCommissionData();
  const saved = await data.updateSettings(parsed.data as CommissionSettings);
  return { ok: true, data: saved };
}

export async function createAgentAction(
  input: AgentInput
): Promise<MutationResult<CommissionAgent>> {
  await requireUser();
  const parsed = agentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid agent." };
  }
  const data = await getCommissionData();
  const agent = await data.createAgent({
    name: parsed.data.name,
    tiers: (parsed.data.tiers ?? null) as Tier[] | null,
  });
  return { ok: true, data: agent };
}

export async function updateAgentAction(
  id: string,
  input: Partial<AgentInput>
): Promise<MutationResult<CommissionAgent>> {
  await requireUser();
  if (!id) return { ok: false, error: "Missing agent id." };
  const parsed = agentSchema.partial().safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid agent." };
  }
  const data = await getCommissionData();
  const agent = await data.updateAgent(id, parsed.data as Partial<AgentInput>);
  if (!agent) return { ok: false, error: "Agent not found." };
  return { ok: true, data: agent };
}

export async function deleteAgentAction(id: string): Promise<MutationResult<null>> {
  await requireUser();
  if (!id) return { ok: false, error: "Missing agent id." };
  const data = await getCommissionData();
  await data.deleteAgent(id);
  return { ok: true, data: null };
}

export async function createEntryAction(
  input: EntryInput
): Promise<MutationResult<CommissionEntry>> {
  await requireUser();
  const parsed = entrySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid commission." };
  }
  const data = await getCommissionData();
  const entry = await data.createEntry(parsed.data as EntryInput);
  return { ok: true, data: entry };
}

export async function deleteEntryAction(id: string): Promise<MutationResult<null>> {
  await requireUser();
  if (!id) return { ok: false, error: "Missing commission id." };
  const data = await getCommissionData();
  await data.deleteEntry(id);
  return { ok: true, data: null };
}
