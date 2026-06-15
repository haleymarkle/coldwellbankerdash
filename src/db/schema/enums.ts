import { pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", [
  "master_admin",
  "high_level_user",
  "office_manager",
  "agent",
]);

export const userStatusEnum = pgEnum("user_status", [
  "active",
  "invited",
  "disabled",
]);

export const toolTypeEnum = pgEnum("tool_type", [
  "internal_route",
  "external_link",
]);

export const trainingStatusEnum = pgEnum("training_status", [
  "not_started",
  "in_progress",
  "completed",
]);
