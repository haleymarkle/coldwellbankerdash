// CRM data-access layer. Mirrors src/lib/commission/data.ts: an in-memory dev
// implementation (active when DATABASE_URL is unset) and a Drizzle/Neon
// implementation for production, both satisfying the same contract.
//
// Owner identity is a `profiles.id` (the login user / single source of truth for
// roles). Visibility scoping is applied by callers via `ownerAgentId` filters.

import "server-only";
import { desc, eq } from "drizzle-orm";

import type {
  Contact,
  ContactActivity,
  ContactSource,
  ContactStage,
  ContactType,
  ContactWithOwner,
} from "@/lib/crm/types";
import { isDbConfigured } from "@/lib/data/db";
import { getData } from "@/lib/data";

export interface ContactInput {
  ownerAgentId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  type: ContactType;
  stage?: ContactStage | null;
  source: ContactSource;
  nextAction?: string | null;
  nextActionDate?: string | null;
}

export interface ActivityInput {
  contactId: string;
  date: string;
  note: string;
  author: string;
}

export interface CrmDataApi {
  listContacts(ownerId: string | null): Promise<ContactWithOwner[]>;
  getContact(id: string): Promise<Contact | null>;
  createContact(input: ContactInput): Promise<Contact>;
  updateContact(id: string, input: Partial<ContactInput>): Promise<Contact | null>;
  deleteContact(id: string): Promise<void>;
  listActivity(contactId: string): Promise<ContactActivity[]>;
  addActivity(input: ActivityInput): Promise<ContactActivity>;
}

const uid = () => crypto.randomUUID();
const nowIso = () => new Date().toISOString();

/** Resolve a map of profile id -> display name for owner labels. */
async function ownerNameMap(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const data = await getData();
  const profiles = await data.listProfiles();
  for (const p of profiles) map.set(p.id, p.displayName);
  return map;
}

// ---------------------------------------------------------------------------
// DEV implementation (in-memory; reset on dev-server restart)
// ---------------------------------------------------------------------------

const devStore: { contacts: Contact[]; activity: ContactActivity[] } = {
  contacts: [],
  activity: [],
};

const devApi: CrmDataApi = {
  async listContacts(ownerId) {
    const rows = devStore.contacts
      .filter((c) => (ownerId ? c.ownerAgentId === ownerId : true))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const names = await ownerNameMap(rows.map((r) => r.ownerAgentId));
    return rows.map((c) => ({ ...c, ownerName: names.get(c.ownerAgentId) ?? null }));
  },
  async getContact(id) {
    return devStore.contacts.find((c) => c.id === id) ?? null;
  },
  async createContact(input) {
    const ts = nowIso();
    const contact: Contact = {
      id: uid(),
      ownerAgentId: input.ownerAgentId,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      type: input.type,
      stage: input.stage ?? null,
      source: input.source,
      nextAction: input.nextAction ?? null,
      nextActionDate: input.nextActionDate ?? null,
      createdAt: ts,
      updatedAt: ts,
    };
    devStore.contacts.push(contact);
    return { ...contact };
  },
  async updateContact(id, input) {
    const c = devStore.contacts.find((x) => x.id === id);
    if (!c) return null;
    if (input.name !== undefined) c.name = input.name;
    if (input.email !== undefined) c.email = input.email ?? null;
    if (input.phone !== undefined) c.phone = input.phone ?? null;
    if (input.type !== undefined) c.type = input.type;
    if (input.stage !== undefined) c.stage = input.stage ?? null;
    if (input.source !== undefined) c.source = input.source;
    if (input.nextAction !== undefined) c.nextAction = input.nextAction ?? null;
    if (input.nextActionDate !== undefined)
      c.nextActionDate = input.nextActionDate ?? null;
    c.updatedAt = nowIso();
    return { ...c };
  },
  async deleteContact(id) {
    devStore.contacts = devStore.contacts.filter((c) => c.id !== id);
    devStore.activity = devStore.activity.filter((a) => a.contactId !== id);
  },
  async listActivity(contactId) {
    return devStore.activity
      .filter((a) => a.contactId === contactId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((a) => ({ ...a }));
  },
  async addActivity(input) {
    const activity: ContactActivity = {
      id: uid(),
      contactId: input.contactId,
      date: input.date,
      note: input.note,
      author: input.author,
      createdAt: nowIso(),
    };
    devStore.activity.push(activity);
    return { ...activity };
  },
};

// ---------------------------------------------------------------------------
// PRODUCTION implementation (Drizzle/Neon)
// ---------------------------------------------------------------------------

async function makeDbApi(): Promise<CrmDataApi> {
  const { getDb } = await import("@/lib/data/db");
  const { contacts, contactActivity } = await import("@/db/schema");
  const db = getDb();

  type ContactRow = typeof contacts.$inferSelect;
  type ActivityRow = typeof contactActivity.$inferSelect;

  const mapContact = (row: ContactRow): Contact => ({
    id: row.id,
    ownerAgentId: row.ownerAgentId,
    name: row.name,
    email: row.email,
    phone: row.phone,
    type: row.type as ContactType,
    stage: (row.stage ?? null) as ContactStage | null,
    source: row.source as ContactSource,
    nextAction: row.nextAction,
    nextActionDate: row.nextActionDate,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });

  const mapActivity = (row: ActivityRow): ContactActivity => ({
    id: row.id,
    contactId: row.contactId,
    date: row.activityDate,
    note: row.note,
    author: row.author,
    createdAt: row.createdAt.toISOString(),
  });

  return {
    async listContacts(ownerId) {
      const rows = ownerId
        ? await db
            .select()
            .from(contacts)
            .where(eq(contacts.ownerAgentId, ownerId))
            .orderBy(desc(contacts.createdAt))
        : await db.select().from(contacts).orderBy(desc(contacts.createdAt));
      const mapped = rows.map(mapContact);
      const names = await ownerNameMap(mapped.map((m) => m.ownerAgentId));
      return mapped.map((c) => ({
        ...c,
        ownerName: names.get(c.ownerAgentId) ?? null,
      }));
    },
    async getContact(id) {
      const [row] = await db
        .select()
        .from(contacts)
        .where(eq(contacts.id, id))
        .limit(1);
      return row ? mapContact(row) : null;
    },
    async createContact(input) {
      const [row] = await db
        .insert(contacts)
        .values({
          ownerAgentId: input.ownerAgentId,
          name: input.name,
          email: input.email ?? null,
          phone: input.phone ?? null,
          type: input.type,
          stage: input.stage ?? null,
          source: input.source,
          nextAction: input.nextAction ?? null,
          nextActionDate: input.nextActionDate ?? null,
        })
        .returning();
      return mapContact(row);
    },
    async updateContact(id, input) {
      const patch: Partial<typeof contacts.$inferInsert> = { updatedAt: new Date() };
      if (input.name !== undefined) patch.name = input.name;
      if (input.email !== undefined) patch.email = input.email ?? null;
      if (input.phone !== undefined) patch.phone = input.phone ?? null;
      if (input.type !== undefined) patch.type = input.type;
      if (input.stage !== undefined) patch.stage = input.stage ?? null;
      if (input.source !== undefined) patch.source = input.source;
      if (input.nextAction !== undefined) patch.nextAction = input.nextAction ?? null;
      if (input.nextActionDate !== undefined)
        patch.nextActionDate = input.nextActionDate ?? null;
      const [row] = await db
        .update(contacts)
        .set(patch)
        .where(eq(contacts.id, id))
        .returning();
      return row ? mapContact(row) : null;
    },
    async deleteContact(id) {
      await db.delete(contactActivity).where(eq(contactActivity.contactId, id));
      await db.delete(contacts).where(eq(contacts.id, id));
    },
    async listActivity(contactId) {
      const rows = await db
        .select()
        .from(contactActivity)
        .where(eq(contactActivity.contactId, contactId))
        .orderBy(desc(contactActivity.activityDate), desc(contactActivity.createdAt));
      return rows.map(mapActivity);
    },
    async addActivity(input) {
      const [row] = await db
        .insert(contactActivity)
        .values({
          contactId: input.contactId,
          activityDate: input.date,
          note: input.note,
          author: input.author,
        })
        .returning();
      return mapActivity(row);
    },
  };
}

// ---------------------------------------------------------------------------
// Env-gated accessor
// ---------------------------------------------------------------------------

let dbApiPromise: Promise<CrmDataApi> | null = null;

export async function getCrmData(): Promise<CrmDataApi> {
  if (!isDbConfigured()) return devApi;
  if (!dbApiPromise) dbApiPromise = makeDbApi();
  return dbApiPromise;
}
