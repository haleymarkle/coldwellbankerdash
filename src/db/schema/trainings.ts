import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { roleEnum, trainingStatusEnum } from "./enums";
import { profiles } from "./profiles";

export const trainings = pgTable(
  "trainings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    content: text("content"),
    url: text("url"),
    category: text("category").notNull().default("General"),
    // Roles this training is required for (Postgres enum array).
    requiredForRoles: roleEnum("required_for_roles").array(),
    estimatedMinutes: integer("estimated_minutes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("trainings_category_idx").on(t.category)]
);

// Assignment + progress merged: status/timestamps/score ARE the progress.
export const trainingAssignments = pgTable(
  "training_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    trainingId: uuid("training_id")
      .notNull()
      .references(() => trainings.id, { onDelete: "cascade" }),
    status: trainingStatusEnum("status").notNull().default("not_started"),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    score: integer("score"),
  },
  (t) => [
    uniqueIndex("training_assign_uq").on(t.profileId, t.trainingId),
    index("training_assign_profile_idx").on(t.profileId),
    index("training_assign_status_idx").on(t.status),
  ]
);
