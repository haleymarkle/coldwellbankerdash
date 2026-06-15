import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { roleEnum, userStatusEnum } from "./enums";
import { offices } from "./offices";

// Application profile linked to a Neon Auth (Better Auth) user.
// `userId` == `session.user.id`. We store it as text with a unique index and
// NO hard FK so an admin can create an "invited" profile before the user's
// first sign-in (the auth user row may not exist yet).
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    role: roleEnum("role").notNull().default("agent"),
    status: userStatusEnum("status").notNull().default("invited"),
    officeId: uuid("office_id").references(() => offices.id, {
      onDelete: "set null",
    }),
    title: text("title"),
    phone: text("phone"),
    avatarUrl: text("avatar_url"),
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("profiles_user_id_uq").on(t.userId),
    index("profiles_office_idx").on(t.officeId),
    index("profiles_role_idx").on(t.role),
  ]
);
