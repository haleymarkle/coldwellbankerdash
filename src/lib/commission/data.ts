// Commission ledger data-access layer. Mirrors the project's pattern in
// src/lib/data/index.ts: an in-memory dev implementation (active when
// DATABASE_URL is unset) and a Drizzle/Neon implementation for production,
// both satisfying the same CommissionDataApi contract.

import "server-only";
import { asc } from "drizzle-orm";
import { eq } from "drizzle-orm";
import type {
  CommissionAgent,
  CommissionEntry,
  CommissionSettings,
  CrossingMethod,
  Tier,
} from "@/lib/commission/calc";
import { DEFAULT_SETTINGS } from "@/lib/commission/calc";
import { isDbConfigured } from "@/lib/data/db";

export interface AgentInput {
  name: string;
  tiers?: Tier[] | null;
}

export interface EntryInput {
  agentId: string;
  date: string;
  property?: string;
  gci: number;
  referralType: "percent" | "flat";
  referralValue: number;
}

export interface CommissionDataApi {
  getSettings(): Promise<CommissionSettings>;
  updateSettings(input: CommissionSettings): Promise<CommissionSettings>;

  listAgents(): Promise<CommissionAgent[]>;
  createAgent(input: AgentInput): Promise<CommissionAgent>;
  updateAgent(id: string, input: Partial<AgentInput>): Promise<CommissionAgent | null>;
  deleteAgent(id: string): Promise<void>;

  listEntries(): Promise<CommissionEntry[]>;
  createEntry(input: EntryInput): Promise<CommissionEntry>;
  deleteEntry(id: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// DEV implementation (in-memory; reset on dev-server restart)
// ---------------------------------------------------------------------------

const uid = () => crypto.randomUUID();

const devStore: {
  settings: CommissionSettings;
  agents: CommissionAgent[];
  entries: CommissionEntry[];
} = {
  settings: { ...DEFAULT_SETTINGS, tiers: DEFAULT_SETTINGS.tiers.map((t) => ({ ...t })) },
  agents: [{ id: uid(), name: "Sample Agent", tiers: null }],
  entries: [],
};

const devApi: CommissionDataApi = {
  async getSettings() {
    return { ...devStore.settings, tiers: devStore.settings.tiers.map((t) => ({ ...t })) };
  },
  async updateSettings(input) {
    devStore.settings = { ...input, tiers: input.tiers.map((t) => ({ ...t })) };
    return this.getSettings();
  },
  async listAgents() {
    return devStore.agents.map((a) => ({ ...a, tiers: a.tiers ? a.tiers.map((t) => ({ ...t })) : a.tiers }));
  },
  async createAgent(input) {
    const agent: CommissionAgent = { id: uid(), name: input.name, tiers: input.tiers ?? null };
    devStore.agents.push(agent);
    return { ...agent };
  },
  async updateAgent(id, input) {
    const agent = devStore.agents.find((a) => a.id === id);
    if (!agent) return null;
    if (input.name !== undefined) agent.name = input.name;
    if (input.tiers !== undefined) agent.tiers = input.tiers;
    return { ...agent };
  },
  async deleteAgent(id) {
    devStore.agents = devStore.agents.filter((a) => a.id !== id);
    devStore.entries = devStore.entries.filter((e) => e.agentId !== id);
  },
  async listEntries() {
    return devStore.entries.map((e) => ({ ...e }));
  },
  async createEntry(input) {
    const entry: CommissionEntry = {
      id: uid(),
      agentId: input.agentId,
      date: input.date,
      property: input.property ?? "",
      gci: input.gci,
      referralType: input.referralType,
      referralValue: input.referralValue,
      createdAt: Date.now(),
    };
    devStore.entries.push(entry);
    return { ...entry };
  },
  async deleteEntry(id) {
    devStore.entries = devStore.entries.filter((e) => e.id !== id);
  },
};

// ---------------------------------------------------------------------------
// PRODUCTION implementation (Drizzle/Neon)
// ---------------------------------------------------------------------------

async function makeDbApi(): Promise<CommissionDataApi> {
  const { getDb } = await import("@/lib/data/db");
  const { commissionSettings, commissionAgents, commissionEntries } =
    await import("@/db/schema");
  const db = getDb();

  type SettingsRow = typeof commissionSettings.$inferSelect;
  type AgentRow = typeof commissionAgents.$inferSelect;
  type EntryRow = typeof commissionEntries.$inferSelect;

  const mapSettings = (row: SettingsRow): CommissionSettings => ({
    corporatePct: Number(row.corporatePct),
    basisIncludesCorporate: row.basisIncludesCorporate,
    crossingMethod: row.crossingMethod as CrossingMethod,
    tiers: (row.tiers ?? DEFAULT_SETTINGS.tiers) as Tier[],
  });
  const mapAgent = (row: AgentRow): CommissionAgent => ({
    id: row.id,
    name: row.name,
    tiers: (row.tiers ?? null) as Tier[] | null,
  });
  const mapEntry = (row: EntryRow): CommissionEntry => ({
    id: row.id,
    agentId: row.agentId,
    date: row.entryDate,
    property: row.property,
    gci: Number(row.gci),
    referralType: row.referralType as "percent" | "flat",
    referralValue: Number(row.referralValue),
    createdAt: row.createdAt.getTime(),
  });

  // Ensure exactly one settings row exists, returning it.
  async function ensureSettingsRow(): Promise<SettingsRow> {
    const rows = await db.select().from(commissionSettings).limit(1);
    if (rows[0]) return rows[0];
    const [row] = await db
      .insert(commissionSettings)
      .values({
        corporatePct: String(DEFAULT_SETTINGS.corporatePct),
        basisIncludesCorporate: DEFAULT_SETTINGS.basisIncludesCorporate,
        crossingMethod: DEFAULT_SETTINGS.crossingMethod,
        tiers: DEFAULT_SETTINGS.tiers,
      })
      .returning();
    return row;
  }

  return {
    async getSettings() {
      return mapSettings(await ensureSettingsRow());
    },
    async updateSettings(input) {
      const existing = await ensureSettingsRow();
      const [row] = await db
        .update(commissionSettings)
        .set({
          corporatePct: String(input.corporatePct),
          basisIncludesCorporate: input.basisIncludesCorporate,
          crossingMethod: input.crossingMethod,
          tiers: input.tiers,
          updatedAt: new Date(),
        })
        .where(eq(commissionSettings.id, existing.id))
        .returning();
      return mapSettings(row);
    },
    async listAgents() {
      const rows = await db
        .select()
        .from(commissionAgents)
        .orderBy(asc(commissionAgents.createdAt));
      return rows.map(mapAgent);
    },
    async createAgent(input) {
      const [row] = await db
        .insert(commissionAgents)
        .values({ name: input.name, tiers: input.tiers ?? null })
        .returning();
      return mapAgent(row);
    },
    async updateAgent(id, input) {
      const patch: Partial<typeof commissionAgents.$inferInsert> = {};
      if (input.name !== undefined) patch.name = input.name;
      if (input.tiers !== undefined) patch.tiers = input.tiers;
      const [row] = await db
        .update(commissionAgents)
        .set(patch)
        .where(eq(commissionAgents.id, id))
        .returning();
      return row ? mapAgent(row) : null;
    },
    async deleteAgent(id) {
      await db.delete(commissionEntries).where(eq(commissionEntries.agentId, id));
      await db.delete(commissionAgents).where(eq(commissionAgents.id, id));
    },
    async listEntries() {
      const rows = await db
        .select()
        .from(commissionEntries)
        .orderBy(asc(commissionEntries.entryDate), asc(commissionEntries.createdAt));
      return rows.map(mapEntry);
    },
    async createEntry(input) {
      const [row] = await db
        .insert(commissionEntries)
        .values({
          agentId: input.agentId,
          entryDate: input.date,
          property: input.property ?? "",
          gci: String(input.gci),
          referralType: input.referralType,
          referralValue: String(input.referralValue),
        })
        .returning();
      return mapEntry(row);
    },
    async deleteEntry(id) {
      await db.delete(commissionEntries).where(eq(commissionEntries.id, id));
    },
  };
}

// ---------------------------------------------------------------------------
// Env-gated accessor
// ---------------------------------------------------------------------------

let dbApiPromise: Promise<CommissionDataApi> | null = null;

export async function getCommissionData(): Promise<CommissionDataApi> {
  if (!isDbConfigured()) return devApi;
  if (!dbApiPromise) dbApiPromise = makeDbApi();
  return dbApiPromise;
}
