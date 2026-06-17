import {
  boolean,
  date,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { Tier } from "@/lib/commission/calc";

// Brokerage-wide commission ledger. Three tables:
//  - commission_settings: single config row (corporate fee, tiers, rules)
//  - commission_agents:    agents, each with optional per-agent tier overrides
//  - commission_entries:   logged deals (GCI, referral, property, date)
//
// `tiers` is stored as jsonb (array of { threshold, agentPct, companyPct }).
// numeric columns map to strings via the neon-http driver, so the data layer
// parses them with Number(...).

export const commissionSettings = pgTable("commission_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  corporatePct: numeric("corporate_pct").notNull().default("6"),
  basisIncludesCorporate: boolean("basis_includes_corporate")
    .notNull()
    .default(false),
  crossingMethod: text("crossing_method").notNull().default("transaction"),
  tiers: jsonb("tiers").$type<Tier[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const commissionAgents = pgTable("commission_agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  // null = use the global settings tiers.
  tiers: jsonb("tiers").$type<Tier[] | null>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const commissionEntries = pgTable(
  "commission_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id").notNull(),
    entryDate: date("entry_date").notNull(),
    property: text("property").notNull().default(""),
    gci: numeric("gci").notNull().default("0"),
    referralType: text("referral_type").notNull().default("percent"),
    referralValue: numeric("referral_value").notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("commission_entries_agent_idx").on(t.agentId),
    index("commission_entries_date_idx").on(t.entryDate),
  ]
);
