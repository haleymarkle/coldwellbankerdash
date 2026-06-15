// Data-access layer — the single contract every page and server action uses.
//
//   const data = await getData();
//   const offices = await data.listOffices();
//
// In DEV (no DATABASE_URL) this is backed by the in-memory `store` in
// ./seed-data, so the whole app is clickable with zero credentials and admin
// CRUD actually mutates state. In PRODUCTION (DATABASE_URL set) it lazy-loads
// the Drizzle/Neon implementation from ./queries-db, which implements the exact
// same `DataApi` interface. Wiring Neon never changes a single call site.

import "server-only";
import type {
  CurrentUser,
  Office,
  Profile,
  ProfileWithOffice,
  Role,
  Tool,
  ToolType,
  Training,
  TrainingAssignment,
  TrainingStatus,
  TrainingWithProgress,
  UserStatus,
} from "@/lib/types";
import { canAccessTool } from "@/lib/rbac";
import { isDbConfigured } from "./db";
import { store } from "./seed-data";

// ---------------------------------------------------------------------------
// Input shapes for mutations
// ---------------------------------------------------------------------------

export interface OfficeInput {
  name: string;
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  region?: string | null;
  isActive?: boolean;
}

export interface ProfileInput {
  userId?: string;
  email: string;
  displayName: string;
  role: Role;
  status?: UserStatus;
  officeId?: string | null;
  title?: string | null;
  phone?: string | null;
}

export interface ToolInput {
  slug: string;
  name: string;
  description: string;
  icon: string;
  type: ToolType;
  url: string;
  category: string;
  roles: Role[];
  sortOrder?: number;
  isActive?: boolean;
}

export interface TrainingInput {
  title: string;
  description: string;
  content?: string | null;
  url?: string | null;
  category: string;
  requiredForRoles: Role[];
  estimatedMinutes?: number | null;
  isActive?: boolean;
}

export interface OfficeProgressRow {
  profile: ProfileWithOffice;
  assigned: number;
  completed: number;
  inProgress: number;
  completionPct: number;
}

export interface TrainingStats {
  assigned: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  completionPct: number;
}

export interface DashboardData {
  toolCount: number;
  stats: TrainingStats;
  recentTrainings: TrainingWithProgress[];
}

// ---------------------------------------------------------------------------
// The contract
// ---------------------------------------------------------------------------

export interface DataApi {
  // Offices
  listOffices(): Promise<Office[]>;
  getOffice(id: string): Promise<Office | null>;
  createOffice(input: OfficeInput): Promise<Office>;
  updateOffice(id: string, input: Partial<OfficeInput>): Promise<Office | null>;
  deleteOffice(id: string): Promise<void>;

  // Profiles (users)
  listProfiles(): Promise<ProfileWithOffice[]>;
  listProfilesByOffice(officeId: string): Promise<ProfileWithOffice[]>;
  getProfileByUserId(userId: string): Promise<Profile | null>;
  getProfileById(id: string): Promise<Profile | null>;
  createProfile(input: ProfileInput): Promise<Profile>;
  updateProfile(id: string, input: Partial<ProfileInput>): Promise<Profile | null>;
  deleteProfile(id: string): Promise<void>;

  // Tools
  listTools(): Promise<Tool[]>;
  getToolBySlug(slug: string): Promise<Tool | null>;
  getToolsForUser(user: Pick<CurrentUser, "role" | "officeId">): Promise<Tool[]>;
  createTool(input: ToolInput): Promise<Tool>;
  updateTool(id: string, input: Partial<ToolInput>): Promise<Tool | null>;
  deleteTool(id: string): Promise<void>;

  // Trainings
  listTrainings(): Promise<Training[]>;
  getTrainingById(id: string): Promise<Training | null>;
  createTraining(input: TrainingInput): Promise<Training>;
  updateTraining(id: string, input: Partial<TrainingInput>): Promise<Training | null>;
  deleteTraining(id: string): Promise<void>;

  // Assignments / progress
  getAssignedTrainings(profileId: string): Promise<TrainingWithProgress[]>;
  assignTraining(profileId: string, trainingId: string): Promise<TrainingAssignment>;
  unassignTraining(profileId: string, trainingId: string): Promise<void>;
  setTrainingStatus(
    profileId: string,
    trainingId: string,
    status: TrainingStatus
  ): Promise<TrainingAssignment | null>;
  getUserTrainingStats(profileId: string): Promise<TrainingStats>;
  getOfficeProgress(officeId: string): Promise<OfficeProgressRow[]>;
  getDashboardData(
    user: Pick<CurrentUser, "id" | "role" | "officeId">
  ): Promise<DashboardData>;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function computeStats(items: { status: TrainingStatus }[]): TrainingStats {
  const assigned = items.length;
  const completed = items.filter((i) => i.status === "completed").length;
  const inProgress = items.filter((i) => i.status === "in_progress").length;
  const notStarted = items.filter((i) => i.status === "not_started").length;
  const completionPct = assigned === 0 ? 0 : Math.round((completed / assigned) * 100);
  return { assigned, completed, inProgress, notStarted, completionPct };
}

// ---------------------------------------------------------------------------
// DEV implementation (in-memory store)
// ---------------------------------------------------------------------------

function officeName(officeId: string | null): string | null {
  if (!officeId) return null;
  return store.offices.find((o) => o.id === officeId)?.name ?? null;
}

function withOffice(p: Profile): ProfileWithOffice {
  return { ...p, officeName: officeName(p.officeId) };
}

const devApi: DataApi = {
  async listOffices() {
    return store.offices.map((o) => ({ ...o }));
  },
  async getOffice(id) {
    return store.offices.find((o) => o.id === id) ?? null;
  },
  async createOffice(input) {
    const office: Office = {
      id: newId("office"),
      name: input.name,
      addressLine1: input.addressLine1 ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      postalCode: input.postalCode ?? null,
      region: input.region ?? null,
      isActive: input.isActive ?? true,
    };
    store.offices.push(office);
    return office;
  },
  async updateOffice(id, input) {
    const office = store.offices.find((o) => o.id === id);
    if (!office) return null;
    Object.assign(office, input);
    return { ...office };
  },
  async deleteOffice(id) {
    store.offices = store.offices.filter((o) => o.id !== id);
    for (const p of store.profiles) if (p.officeId === id) p.officeId = null;
  },

  async listProfiles() {
    return store.profiles.map(withOffice);
  },
  async listProfilesByOffice(officeId) {
    return store.profiles.filter((p) => p.officeId === officeId).map(withOffice);
  },
  async getProfileByUserId(userId) {
    return store.profiles.find((p) => p.userId === userId) ?? null;
  },
  async getProfileById(id) {
    return store.profiles.find((p) => p.id === id) ?? null;
  },
  async createProfile(input) {
    const profile: Profile = {
      id: newId("profile"),
      userId: input.userId ?? newId("user"),
      email: input.email,
      displayName: input.displayName,
      role: input.role,
      status: input.status ?? "invited",
      officeId: input.officeId ?? null,
      title: input.title ?? null,
      phone: input.phone ?? null,
      avatarUrl: null,
      createdAt: nowIso(),
    };
    store.profiles.push(profile);
    return profile;
  },
  async updateProfile(id, input) {
    const profile = store.profiles.find((p) => p.id === id);
    if (!profile) return null;
    Object.assign(profile, input);
    return { ...profile };
  },
  async deleteProfile(id) {
    store.profiles = store.profiles.filter((p) => p.id !== id);
    store.assignments = store.assignments.filter((a) => a.profileId !== id);
  },

  async listTools() {
    return store.tools.map((t) => ({ ...t, roles: [...t.roles] }));
  },
  async getToolBySlug(slug) {
    const tool = store.tools.find((t) => t.slug === slug);
    return tool ? { ...tool, roles: [...tool.roles] } : null;
  },
  async getToolsForUser(user) {
    return store.tools
      .filter((t) => canAccessTool(user, t))
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((t) => ({ ...t, roles: [...t.roles] }));
  },
  async createTool(input) {
    const tool: Tool = {
      id: newId("tool"),
      slug: input.slug,
      name: input.name,
      description: input.description,
      icon: input.icon,
      type: input.type,
      url: input.url,
      category: input.category,
      roles: [...input.roles],
      sortOrder: input.sortOrder ?? 100,
      isActive: input.isActive ?? true,
    };
    store.tools.push(tool);
    return tool;
  },
  async updateTool(id, input) {
    const tool = store.tools.find((t) => t.id === id);
    if (!tool) return null;
    Object.assign(tool, input);
    if (input.roles) tool.roles = [...input.roles];
    return { ...tool, roles: [...tool.roles] };
  },
  async deleteTool(id) {
    store.tools = store.tools.filter((t) => t.id !== id);
  },

  async listTrainings() {
    return store.trainings.map((t) => ({
      ...t,
      requiredForRoles: [...t.requiredForRoles],
    }));
  },
  async getTrainingById(id) {
    const t = store.trainings.find((x) => x.id === id);
    return t ? { ...t, requiredForRoles: [...t.requiredForRoles] } : null;
  },
  async createTraining(input) {
    const training: Training = {
      id: newId("training"),
      title: input.title,
      description: input.description,
      content: input.content ?? null,
      url: input.url ?? null,
      category: input.category,
      requiredForRoles: [...input.requiredForRoles],
      estimatedMinutes: input.estimatedMinutes ?? null,
      isActive: input.isActive ?? true,
    };
    store.trainings.push(training);
    return training;
  },
  async updateTraining(id, input) {
    const training = store.trainings.find((t) => t.id === id);
    if (!training) return null;
    Object.assign(training, input);
    if (input.requiredForRoles) training.requiredForRoles = [...input.requiredForRoles];
    return { ...training, requiredForRoles: [...training.requiredForRoles] };
  },
  async deleteTraining(id) {
    store.trainings = store.trainings.filter((t) => t.id !== id);
    store.assignments = store.assignments.filter((a) => a.trainingId !== id);
  },

  async getAssignedTrainings(profileId) {
    const result: TrainingWithProgress[] = [];
    for (const a of store.assignments) {
      if (a.profileId !== profileId) continue;
      const training = store.trainings.find((t) => t.id === a.trainingId);
      if (!training) continue;
      result.push({
        ...training,
        requiredForRoles: [...training.requiredForRoles],
        assignment: { ...a },
      });
    }
    return result;
  },
  async assignTraining(profileId, trainingId) {
    const existing = store.assignments.find(
      (a) => a.profileId === profileId && a.trainingId === trainingId
    );
    if (existing) return { ...existing };
    const assignment: TrainingAssignment = {
      id: newId("assign"),
      profileId,
      trainingId,
      status: "not_started",
      assignedAt: nowIso(),
      startedAt: null,
      completedAt: null,
      score: null,
    };
    store.assignments.push(assignment);
    return assignment;
  },
  async unassignTraining(profileId, trainingId) {
    store.assignments = store.assignments.filter(
      (a) => !(a.profileId === profileId && a.trainingId === trainingId)
    );
  },
  async setTrainingStatus(profileId, trainingId, status) {
    const assignment = store.assignments.find(
      (a) => a.profileId === profileId && a.trainingId === trainingId
    );
    if (!assignment) return null;
    assignment.status = status;
    if (status === "in_progress" && !assignment.startedAt) {
      assignment.startedAt = nowIso();
    }
    if (status === "completed") {
      assignment.completedAt = nowIso();
      if (!assignment.startedAt) assignment.startedAt = assignment.assignedAt;
    }
    if (status === "not_started") {
      assignment.startedAt = null;
      assignment.completedAt = null;
    }
    return { ...assignment };
  },
  async getUserTrainingStats(profileId) {
    const items = store.assignments.filter((a) => a.profileId === profileId);
    return computeStats(items);
  },
  async getOfficeProgress(officeId) {
    return store.profiles
      .filter((p) => p.officeId === officeId)
      .map((p) => {
        const items = store.assignments.filter((a) => a.profileId === p.id);
        const stats = computeStats(items);
        return {
          profile: withOffice(p),
          assigned: stats.assigned,
          completed: stats.completed,
          inProgress: stats.inProgress,
          completionPct: stats.completionPct,
        } satisfies OfficeProgressRow;
      });
  },
  async getDashboardData(user) {
    const tools = await devApi.getToolsForUser(user);
    const stats = await devApi.getUserTrainingStats(user.id);
    const recentTrainings = (await devApi.getAssignedTrainings(user.id)).slice(0, 3);
    return { toolCount: tools.length, stats, recentTrainings };
  },
};

// ---------------------------------------------------------------------------
// Env-gated accessor
// ---------------------------------------------------------------------------

let dbApiPromise: Promise<DataApi> | null = null;

/** Returns the active data API (in-memory dev store, or Drizzle/Neon in prod). */
export async function getData(): Promise<DataApi> {
  if (!isDbConfigured()) return devApi;
  if (!dbApiPromise) {
    dbApiPromise = import("./queries-db").then((m) => m.dbApi);
  }
  return dbApiPromise;
}
