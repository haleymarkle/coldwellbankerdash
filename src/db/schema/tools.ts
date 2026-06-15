import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { roleEnum, toolTypeEnum } from "./enums";
import { offices } from "./offices";
import { profiles } from "./profiles";

export const tools = pgTable(
  "tools",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    icon: text("icon"),
    type: toolTypeEnum("type").notNull().default("internal_route"),
    url: text("url").notNull(),
    category: text("category").notNull().default("General"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("tools_slug_uq").on(t.slug),
    index("tools_category_idx").on(t.category),
    index("tools_active_idx").on(t.isActive),
  ]
);

// Primary RBAC: which roles can access which tools.
export const toolRoleAccess = pgTable(
  "tool_role_access",
  {
    toolId: uuid("tool_id")
      .notNull()
      .references(() => tools.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull(),
  },
  (t) => [primaryKey({ columns: [t.toolId, t.role] })]
);

// Optional office scoping. No rows for a tool == available to all offices.
export const toolOfficeAccess = pgTable(
  "tool_office_access",
  {
    toolId: uuid("tool_id")
      .notNull()
      .references(() => tools.id, { onDelete: "cascade" }),
    officeId: uuid("office_id")
      .notNull()
      .references(() => offices.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.toolId, t.officeId] })]
);

// Optional per-user grant (allow=true) / deny (allow=false) override.
export const toolUserOverride = pgTable(
  "tool_user_override",
  {
    toolId: uuid("tool_id")
      .notNull()
      .references(() => tools.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    allow: boolean("allow").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.toolId, t.profileId] })]
);
