import { relations } from "drizzle-orm";
import { offices } from "./offices";
import { profiles } from "./profiles";
import {
  tools,
  toolRoleAccess,
  toolOfficeAccess,
  toolUserOverride,
} from "./tools";
import { trainings, trainingAssignments } from "./trainings";

export * from "./enums";
export * from "./offices";
export * from "./profiles";
export * from "./tools";
export * from "./trainings";
export * from "./audit";

export const officesRelations = relations(offices, ({ many }) => ({
  profiles: many(profiles),
}));

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  office: one(offices, {
    fields: [profiles.officeId],
    references: [offices.id],
  }),
  trainingAssignments: many(trainingAssignments),
  toolOverrides: many(toolUserOverride),
}));

export const toolsRelations = relations(tools, ({ many }) => ({
  roleAccess: many(toolRoleAccess),
  officeAccess: many(toolOfficeAccess),
  userOverrides: many(toolUserOverride),
}));

export const toolRoleAccessRelations = relations(toolRoleAccess, ({ one }) => ({
  tool: one(tools, { fields: [toolRoleAccess.toolId], references: [tools.id] }),
}));

export const trainingsRelations = relations(trainings, ({ many }) => ({
  assignments: many(trainingAssignments),
}));

export const trainingAssignmentsRelations = relations(
  trainingAssignments,
  ({ one }) => ({
    profile: one(profiles, {
      fields: [trainingAssignments.profileId],
      references: [profiles.id],
    }),
    training: one(trainings, {
      fields: [trainingAssignments.trainingId],
      references: [trainings.id],
    }),
  })
);

// Drizzle-inferred types (production data layer can use these).
export type ProfileRow = typeof profiles.$inferSelect;
export type NewProfileRow = typeof profiles.$inferInsert;
export type OfficeRow = typeof offices.$inferSelect;
export type ToolRow = typeof tools.$inferSelect;
export type TrainingRow = typeof trainings.$inferSelect;
export type TrainingAssignmentRow = typeof trainingAssignments.$inferSelect;
