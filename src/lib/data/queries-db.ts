// Production data-access layer — Drizzle + Neon HTTP client.
//
// Implements the exact `DataApi` contract from ./index.ts, backed by Postgres.
// Lazy-loaded only when DATABASE_URL is set (see getData() in ./index.ts), so
// importing this module is always safe; getDb() throws if the env is missing.
//
// neon-http does NOT support interactive transactions. Where several writes must
// land together we use `db.batch([...])` (a single round-trip, atomic on the
// server); otherwise we await sequentially.

import "server-only";
import { eq, and, inArray, asc } from "drizzle-orm";
import type {
  CurrentUser,
  Office,
  Profile,
  ProfileWithOffice,
  Role,
  Tool,
  Training,
  TrainingAssignment,
  TrainingStatus,
  TrainingWithProgress,
} from "@/lib/types";
import { canAccessTool } from "@/lib/rbac";
import {
  offices,
  profiles,
  tools,
  toolRoleAccess,
  toolOfficeAccess,
  toolUserOverride,
  trainings,
  trainingAssignments,
} from "@/db/schema";
import { getDb } from "./db";
import type {
  DataApi,
  OfficeInput,
  OfficeProgressRow,
  ProfileInput,
  ToolInput,
  TrainingInput,
  TrainingStats,
} from "./index";

const db = getDb();

// ---------------------------------------------------------------------------
// Row -> domain mappers
// ---------------------------------------------------------------------------

type OfficeRow = typeof offices.$inferSelect;
type ProfileRow = typeof profiles.$inferSelect;
type ToolRow = typeof tools.$inferSelect;
type TrainingRow = typeof trainings.$inferSelect;
type AssignmentRow = typeof trainingAssignments.$inferSelect;

function mapOffice(row: OfficeRow): Office {
  return {
    id: row.id,
    name: row.name,
    addressLine1: row.addressLine1 ?? null,
    city: row.city ?? null,
    state: row.state ?? null,
    postalCode: row.postalCode ?? null,
    region: row.region ?? null,
    isActive: row.isActive,
  };
}

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    userId: row.userId,
    email: row.email,
    displayName: row.displayName,
    role: row.role,
    status: row.status,
    officeId: row.officeId ?? null,
    title: row.title ?? null,
    phone: row.phone ?? null,
    avatarUrl: row.avatarUrl ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapProfileWithOffice(
  row: ProfileRow,
  officeNameValue: string | null
): ProfileWithOffice {
  return { ...mapProfile(row), officeName: officeNameValue };
}

function mapTool(
  row: ToolRow,
  roles: Role[],
  officeIds: string[]
): Tool {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    icon: row.icon ?? "",
    type: row.type,
    url: row.url,
    category: row.category,
    roles,
    officeIds: officeIds.length > 0 ? officeIds : undefined,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
  };
}

function mapTraining(row: TrainingRow): Training {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    content: row.content ?? null,
    url: row.url ?? null,
    category: row.category,
    // Postgres enum array column is nullable -> default to [].
    requiredForRoles: (row.requiredForRoles ?? []) as Role[],
    estimatedMinutes: row.estimatedMinutes ?? null,
    isActive: row.isActive,
  };
}

function mapAssignment(row: AssignmentRow): TrainingAssignment {
  return {
    id: row.id,
    profileId: row.profileId,
    trainingId: row.trainingId,
    status: row.status,
    assignedAt: row.assignedAt.toISOString(),
    startedAt: row.startedAt ? row.startedAt.toISOString() : null,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    score: row.score ?? null,
  };
}

// ---------------------------------------------------------------------------
// Stats helper (mirrors the dev implementation)
// ---------------------------------------------------------------------------

function computeStats(items: { status: TrainingStatus }[]): TrainingStats {
  const assigned = items.length;
  const completed = items.filter((i) => i.status === "completed").length;
  const inProgress = items.filter((i) => i.status === "in_progress").length;
  const notStarted = items.filter((i) => i.status === "not_started").length;
  const completionPct =
    assigned === 0 ? 0 : Math.round((completed / assigned) * 100);
  return { assigned, completed, inProgress, notStarted, completionPct };
}

// ---------------------------------------------------------------------------
// Tool role/office aggregation helper
// ---------------------------------------------------------------------------

/** Fetch role + office access rows for a set of tool ids, grouped by tool id. */
async function loadToolAccess(toolIds: string[]): Promise<{
  rolesByTool: Map<string, Role[]>;
  officesByTool: Map<string, string[]>;
}> {
  const rolesByTool = new Map<string, Role[]>();
  const officesByTool = new Map<string, string[]>();
  if (toolIds.length === 0) return { rolesByTool, officesByTool };

  const [roleRows, officeRows] = await Promise.all([
    db
      .select()
      .from(toolRoleAccess)
      .where(inArray(toolRoleAccess.toolId, toolIds)),
    db
      .select()
      .from(toolOfficeAccess)
      .where(inArray(toolOfficeAccess.toolId, toolIds)),
  ]);

  for (const r of roleRows) {
    const list = rolesByTool.get(r.toolId) ?? [];
    list.push(r.role);
    rolesByTool.set(r.toolId, list);
  }
  for (const o of officeRows) {
    const list = officesByTool.get(o.toolId) ?? [];
    list.push(o.officeId);
    officesByTool.set(o.toolId, list);
  }
  return { rolesByTool, officesByTool };
}

// ---------------------------------------------------------------------------
// The production DataApi
// ---------------------------------------------------------------------------

export const dbApi: DataApi = {
  // ----- Offices ---------------------------------------------------------
  async listOffices() {
    const rows = await db.select().from(offices).orderBy(asc(offices.name));
    return rows.map(mapOffice);
  },

  async getOffice(id) {
    const rows = await db
      .select()
      .from(offices)
      .where(eq(offices.id, id))
      .limit(1);
    return rows[0] ? mapOffice(rows[0]) : null;
  },

  async createOffice(input: OfficeInput) {
    const [row] = await db
      .insert(offices)
      .values({
        name: input.name,
        addressLine1: input.addressLine1 ?? null,
        city: input.city ?? null,
        state: input.state ?? null,
        postalCode: input.postalCode ?? null,
        region: input.region ?? null,
        isActive: input.isActive ?? true,
      })
      .returning();
    return mapOffice(row);
  },

  async updateOffice(id, input: Partial<OfficeInput>) {
    // Build a patch of only the provided keys so we never null-out columns
    // the caller didn't touch.
    const patch: Partial<typeof offices.$inferInsert> = { updatedAt: new Date() };
    if (input.name !== undefined) patch.name = input.name;
    if (input.addressLine1 !== undefined) patch.addressLine1 = input.addressLine1;
    if (input.city !== undefined) patch.city = input.city;
    if (input.state !== undefined) patch.state = input.state;
    if (input.postalCode !== undefined) patch.postalCode = input.postalCode;
    if (input.region !== undefined) patch.region = input.region;
    if (input.isActive !== undefined) patch.isActive = input.isActive;

    const [row] = await db
      .update(offices)
      .set(patch)
      .where(eq(offices.id, id))
      .returning();
    return row ? mapOffice(row) : null;
  },

  async deleteOffice(id) {
    // profiles.officeId has onDelete: "set null" -> agents are detached, not removed.
    await db.delete(offices).where(eq(offices.id, id));
  },

  // ----- Profiles --------------------------------------------------------
  async listProfiles() {
    const rows = await db
      .select({ profile: profiles, officeName: offices.name })
      .from(profiles)
      .leftJoin(offices, eq(profiles.officeId, offices.id))
      .orderBy(asc(profiles.displayName));
    return rows.map((r) => mapProfileWithOffice(r.profile, r.officeName ?? null));
  },

  async listProfilesByOffice(officeId) {
    const rows = await db
      .select({ profile: profiles, officeName: offices.name })
      .from(profiles)
      .leftJoin(offices, eq(profiles.officeId, offices.id))
      .where(eq(profiles.officeId, officeId))
      .orderBy(asc(profiles.displayName));
    return rows.map((r) => mapProfileWithOffice(r.profile, r.officeName ?? null));
  },

  async getProfileByUserId(userId) {
    const rows = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);
    return rows[0] ? mapProfile(rows[0]) : null;
  },

  async getProfileById(id) {
    const rows = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, id))
      .limit(1);
    return rows[0] ? mapProfile(rows[0]) : null;
  },

  async createProfile(input: ProfileInput) {
    const [row] = await db
      .insert(profiles)
      .values({
        // Generate an auth user id when the profile is invited ahead of sign-in.
        userId: input.userId ?? crypto.randomUUID(),
        email: input.email,
        displayName: input.displayName,
        role: input.role,
        status: input.status ?? "invited",
        officeId: input.officeId ?? null,
        title: input.title ?? null,
        phone: input.phone ?? null,
      })
      .returning();
    return mapProfile(row);
  },

  async updateProfile(id, input: Partial<ProfileInput>) {
    const patch: Partial<typeof profiles.$inferInsert> = { updatedAt: new Date() };
    if (input.userId !== undefined) patch.userId = input.userId;
    if (input.email !== undefined) patch.email = input.email;
    if (input.displayName !== undefined) patch.displayName = input.displayName;
    if (input.role !== undefined) patch.role = input.role;
    if (input.status !== undefined) patch.status = input.status;
    if (input.officeId !== undefined) patch.officeId = input.officeId;
    if (input.title !== undefined) patch.title = input.title;
    if (input.phone !== undefined) patch.phone = input.phone;

    const [row] = await db
      .update(profiles)
      .set(patch)
      .where(eq(profiles.id, id))
      .returning();
    return row ? mapProfile(row) : null;
  },

  async deleteProfile(id) {
    // trainingAssignments + toolUserOverride cascade via FK onDelete: "cascade".
    await db.delete(profiles).where(eq(profiles.id, id));
  },

  // ----- Tools -----------------------------------------------------------
  async listTools() {
    const rows = await db.select().from(tools).orderBy(asc(tools.sortOrder));
    const { rolesByTool, officesByTool } = await loadToolAccess(
      rows.map((r) => r.id)
    );
    return rows.map((r) =>
      mapTool(r, rolesByTool.get(r.id) ?? [], officesByTool.get(r.id) ?? [])
    );
  },

  async getToolBySlug(slug) {
    const rows = await db
      .select()
      .from(tools)
      .where(eq(tools.slug, slug))
      .limit(1);
    if (!rows[0]) return null;
    const { rolesByTool, officesByTool } = await loadToolAccess([rows[0].id]);
    return mapTool(
      rows[0],
      rolesByTool.get(rows[0].id) ?? [],
      officesByTool.get(rows[0].id) ?? []
    );
  },

  async getToolsForUser(user: Pick<CurrentUser, "role" | "officeId">) {
    // Fetch active tools + their role/office scoping, then filter in JS with the
    // shared RBAC rule (master_admin bypass). Per-user overrides require a
    // profile id, which the {role, officeId} arg can't provide, so we apply
    // role+office scoping only — acceptable per the data-layer contract.
    const rows = await db
      .select()
      .from(tools)
      .where(eq(tools.isActive, true))
      .orderBy(asc(tools.sortOrder));
    const { rolesByTool, officesByTool } = await loadToolAccess(
      rows.map((r) => r.id)
    );
    return rows
      .map((r) =>
        mapTool(r, rolesByTool.get(r.id) ?? [], officesByTool.get(r.id) ?? [])
      )
      .filter((tool) => canAccessTool(user, tool));
  },

  async createTool(input: ToolInput) {
    const [row] = await db
      .insert(tools)
      .values({
        slug: input.slug,
        name: input.name,
        description: input.description,
        icon: input.icon,
        type: input.type,
        url: input.url,
        category: input.category,
        sortOrder: input.sortOrder ?? 100,
        isActive: input.isActive ?? true,
      })
      .returning();

    // Sync role-access rows to match input.roles.
    const roles = [...new Set(input.roles)];
    if (roles.length > 0) {
      await db
        .insert(toolRoleAccess)
        .values(roles.map((role) => ({ toolId: row.id, role })));
    }
    return mapTool(row, roles, []);
  },

  async updateTool(id, input: Partial<ToolInput>) {
    const patch: Partial<typeof tools.$inferInsert> = { updatedAt: new Date() };
    if (input.slug !== undefined) patch.slug = input.slug;
    if (input.name !== undefined) patch.name = input.name;
    if (input.description !== undefined) patch.description = input.description;
    if (input.icon !== undefined) patch.icon = input.icon;
    if (input.type !== undefined) patch.type = input.type;
    if (input.url !== undefined) patch.url = input.url;
    if (input.category !== undefined) patch.category = input.category;
    if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;
    if (input.isActive !== undefined) patch.isActive = input.isActive;

    const [row] = await db
      .update(tools)
      .set(patch)
      .where(eq(tools.id, id))
      .returning();
    if (!row) return null;

    // If roles were supplied, replace the join rows wholesale (delete + insert).
    if (input.roles !== undefined) {
      const roles = [...new Set(input.roles)];
      await db.delete(toolRoleAccess).where(eq(toolRoleAccess.toolId, id));
      if (roles.length > 0) {
        await db
          .insert(toolRoleAccess)
          .values(roles.map((role) => ({ toolId: id, role })));
      }
    }

    // Re-read current access to return an accurate domain object.
    const { rolesByTool, officesByTool } = await loadToolAccess([id]);
    return mapTool(row, rolesByTool.get(id) ?? [], officesByTool.get(id) ?? []);
  },

  async deleteTool(id) {
    // toolRoleAccess / toolOfficeAccess / toolUserOverride cascade via FK.
    await db.delete(tools).where(eq(tools.id, id));
  },

  // ----- Trainings -------------------------------------------------------
  async listTrainings() {
    const rows = await db
      .select()
      .from(trainings)
      .orderBy(asc(trainings.title));
    return rows.map(mapTraining);
  },

  async getTrainingById(id) {
    const rows = await db
      .select()
      .from(trainings)
      .where(eq(trainings.id, id))
      .limit(1);
    return rows[0] ? mapTraining(rows[0]) : null;
  },

  async createTraining(input: TrainingInput) {
    const [row] = await db
      .insert(trainings)
      .values({
        title: input.title,
        description: input.description,
        content: input.content ?? null,
        url: input.url ?? null,
        category: input.category,
        requiredForRoles: input.requiredForRoles,
        estimatedMinutes: input.estimatedMinutes ?? null,
        isActive: input.isActive ?? true,
      })
      .returning();
    return mapTraining(row);
  },

  async updateTraining(id, input: Partial<TrainingInput>) {
    const patch: Partial<typeof trainings.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (input.title !== undefined) patch.title = input.title;
    if (input.description !== undefined) patch.description = input.description;
    if (input.content !== undefined) patch.content = input.content;
    if (input.url !== undefined) patch.url = input.url;
    if (input.category !== undefined) patch.category = input.category;
    if (input.requiredForRoles !== undefined)
      patch.requiredForRoles = input.requiredForRoles;
    if (input.estimatedMinutes !== undefined)
      patch.estimatedMinutes = input.estimatedMinutes;
    if (input.isActive !== undefined) patch.isActive = input.isActive;

    const [row] = await db
      .update(trainings)
      .set(patch)
      .where(eq(trainings.id, id))
      .returning();
    return row ? mapTraining(row) : null;
  },

  async deleteTraining(id) {
    // trainingAssignments cascade via FK onDelete: "cascade".
    await db.delete(trainings).where(eq(trainings.id, id));
  },

  // ----- Assignments / progress -----------------------------------------
  async getAssignedTrainings(profileId) {
    const rows = await db
      .select({ training: trainings, assignment: trainingAssignments })
      .from(trainingAssignments)
      .innerJoin(
        trainings,
        eq(trainingAssignments.trainingId, trainings.id)
      )
      .where(eq(trainingAssignments.profileId, profileId))
      .orderBy(asc(trainingAssignments.assignedAt));
    return rows.map((r) => ({
      ...mapTraining(r.training),
      assignment: mapAssignment(r.assignment),
    })) satisfies TrainingWithProgress[];
  },

  async assignTraining(profileId, trainingId) {
    // Upsert against the unique (profileId, trainingId) index.
    await db
      .insert(trainingAssignments)
      .values({ profileId, trainingId, status: "not_started" })
      .onConflictDoNothing({
        target: [
          trainingAssignments.profileId,
          trainingAssignments.trainingId,
        ],
      });
    // Return the (existing or new) row.
    const rows = await db
      .select()
      .from(trainingAssignments)
      .where(
        and(
          eq(trainingAssignments.profileId, profileId),
          eq(trainingAssignments.trainingId, trainingId)
        )
      )
      .limit(1);
    return mapAssignment(rows[0]);
  },

  async unassignTraining(profileId, trainingId) {
    await db
      .delete(trainingAssignments)
      .where(
        and(
          eq(trainingAssignments.profileId, profileId),
          eq(trainingAssignments.trainingId, trainingId)
        )
      );
  },

  async setTrainingStatus(profileId, trainingId, status: TrainingStatus) {
    // Read current row so we can apply the same timestamp rules as the dev impl.
    const existing = await db
      .select()
      .from(trainingAssignments)
      .where(
        and(
          eq(trainingAssignments.profileId, profileId),
          eq(trainingAssignments.trainingId, trainingId)
        )
      )
      .limit(1);
    if (!existing[0]) return null;
    const current = existing[0];

    const now = new Date();
    const patch: Partial<typeof trainingAssignments.$inferInsert> = { status };

    if (status === "in_progress" && !current.startedAt) {
      patch.startedAt = now;
    }
    if (status === "completed") {
      patch.completedAt = now;
      if (!current.startedAt) patch.startedAt = current.assignedAt;
    }
    if (status === "not_started") {
      patch.startedAt = null;
      patch.completedAt = null;
    }

    const [row] = await db
      .update(trainingAssignments)
      .set(patch)
      .where(
        and(
          eq(trainingAssignments.profileId, profileId),
          eq(trainingAssignments.trainingId, trainingId)
        )
      )
      .returning();
    return row ? mapAssignment(row) : null;
  },

  async getUserTrainingStats(profileId) {
    const rows = await db
      .select({ status: trainingAssignments.status })
      .from(trainingAssignments)
      .where(eq(trainingAssignments.profileId, profileId));
    return computeStats(rows);
  },

  async getOfficeProgress(officeId) {
    // All profiles in the office, joined for officeName.
    const profileRows = await db
      .select({ profile: profiles, officeName: offices.name })
      .from(profiles)
      .leftJoin(offices, eq(profiles.officeId, offices.id))
      .where(eq(profiles.officeId, officeId))
      .orderBy(asc(profiles.displayName));

    if (profileRows.length === 0) return [];

    // One batched fetch of all assignments for those profiles, grouped in JS.
    const profileIds = profileRows.map((r) => r.profile.id);
    const assignmentRows = await db
      .select({
        profileId: trainingAssignments.profileId,
        status: trainingAssignments.status,
      })
      .from(trainingAssignments)
      .where(inArray(trainingAssignments.profileId, profileIds));

    const byProfile = new Map<string, { status: TrainingStatus }[]>();
    for (const a of assignmentRows) {
      const list = byProfile.get(a.profileId) ?? [];
      list.push({ status: a.status });
      byProfile.set(a.profileId, list);
    }

    return profileRows.map((r) => {
      const stats = computeStats(byProfile.get(r.profile.id) ?? []);
      return {
        profile: mapProfileWithOffice(r.profile, r.officeName ?? null),
        assigned: stats.assigned,
        completed: stats.completed,
        inProgress: stats.inProgress,
        completionPct: stats.completionPct,
      } satisfies OfficeProgressRow;
    });
  },

  async getDashboardData(user: Pick<CurrentUser, "id" | "role" | "officeId">) {
    const [tools_, stats, assigned] = await Promise.all([
      dbApi.getToolsForUser(user),
      dbApi.getUserTrainingStats(user.id),
      dbApi.getAssignedTrainings(user.id),
    ]);
    return {
      toolCount: tools_.length,
      stats,
      recentTrainings: assigned.slice(0, 3),
    };
  },
};
