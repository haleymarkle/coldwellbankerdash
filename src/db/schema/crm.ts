import {
  date,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// CRM enums. Names mirror the Postgres enum types created via the Neon MCP.
export const contactTypeEnum = pgEnum("contact_type", [
  "buyer_lead",
  "seller_lead",
  "active_client",
  "past_client",
  "referral_sphere",
]);

export const contactStageEnum = pgEnum("contact_stage", [
  "new",
  "working",
  "under_contract",
  "closed",
  "past_client",
]);

export const contactSourceEnum = pgEnum("contact_source", [
  "office_call",
  "soi",
  "redfin",
  "zillow_realtor",
  "website",
  "referral",
  "cb_corporate",
  "other",
]);

// A CRM contact owned by a profile (the login user). `ownerAgentId` references
// profiles.id — the single source of truth for "who can log in" and roles — and
// drives per-agent visibility. No hard FK, consistent with the rest of the app.
export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerAgentId: uuid("owner_agent_id").notNull(),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    type: contactTypeEnum("type").notNull().default("buyer_lead"),
    // Referrals/sphere may have no pipeline stage.
    stage: contactStageEnum("stage"),
    source: contactSourceEnum("source").notNull().default("other"),
    nextAction: text("next_action"),
    nextActionDate: date("next_action_date"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("contacts_owner_idx").on(t.ownerAgentId),
    index("contacts_next_action_idx").on(t.nextActionDate),
  ]
);

// Running activity history for a contact.
export const contactActivity = pgTable(
  "contact_activity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contactId: uuid("contact_id").notNull(),
    activityDate: date("activity_date").notNull().defaultNow(),
    note: text("note").notNull().default(""),
    author: text("author").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("contact_activity_contact_idx").on(t.contactId)]
);
