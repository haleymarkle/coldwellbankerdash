// In-memory dev store. Active when DATABASE_URL is NOT set, so the whole app is
// clickable locally with zero credentials. Module-level mutable arrays persist
// across requests within the dev server process (reset on restart), so admin
// CRUD actually works while iterating. Production uses Drizzle/Neon instead.

import type {
  Office,
  Profile,
  Tool,
  Training,
  TrainingAssignment,
} from "@/lib/types";
import { SEED_TOOLS } from "@/lib/tools-registry";

// Dev role-switcher sets a `dev_role` cookie; the dev session user id is
// `dev-<role>`, which maps to one of these profiles.
export const DEV_USER_IDS = {
  master_admin: "dev-master_admin",
  high_level_user: "dev-high_level_user",
  office_manager: "dev-office_manager",
  agent: "dev-agent",
} as const;

const now = "2026-01-05T09:00:00.000Z";

export const seedOffices: Office[] = [
  {
    id: "office-hq",
    name: "Associated Brokers Realty — Sioux City",
    addressLine1: "1222 Pierce Street",
    city: "Sioux City",
    state: "IA",
    postalCode: "51105",
    region: "Siouxland",
    isActive: true,
  },
  {
    id: "office-north",
    name: "Associated Brokers Realty — North Sioux",
    addressLine1: "100 River Drive",
    city: "North Sioux City",
    state: "SD",
    postalCode: "57049",
    region: "Siouxland",
    isActive: true,
  },
];

export const seedProfiles: Profile[] = [
  {
    id: "profile-admin",
    userId: DEV_USER_IDS.master_admin,
    email: "admin@cbabr.com",
    displayName: "Avery Stone",
    role: "master_admin",
    status: "active",
    officeId: "office-hq",
    title: "Platform Administrator",
    avatarUrl: null,
    createdAt: now,
  },
  {
    id: "profile-leadership",
    userId: DEV_USER_IDS.high_level_user,
    email: "haley@cbabr.com",
    displayName: "Haley Markle",
    role: "high_level_user",
    status: "active",
    officeId: "office-hq",
    title: "Broker / Owner",
    avatarUrl: null,
    createdAt: now,
  },
  {
    id: "profile-manager",
    userId: DEV_USER_IDS.office_manager,
    email: "dana@cbabr.com",
    displayName: "Dana Kruselenz",
    role: "office_manager",
    status: "active",
    officeId: "office-hq",
    title: "Office Manager",
    avatarUrl: null,
    createdAt: now,
  },
  {
    id: "profile-agent",
    userId: DEV_USER_IDS.agent,
    email: "katie@cbabr.com",
    displayName: "Katie Irwin",
    role: "agent",
    status: "active",
    officeId: "office-hq",
    title: "Sales Associate",
    avatarUrl: null,
    createdAt: now,
  },
  {
    id: "profile-agent-2",
    userId: "dev-agent-2",
    email: "kamron@cbabr.com",
    displayName: "Kamron Johnson",
    role: "agent",
    status: "active",
    officeId: "office-hq",
    title: "Sales Associate",
    avatarUrl: null,
    createdAt: now,
  },
  {
    id: "profile-agent-3",
    userId: "dev-agent-3",
    email: "rosa@cbabr.com",
    displayName: "Rosa Garcia-Cabrales",
    role: "agent",
    status: "invited",
    officeId: "office-north",
    title: "Sales Associate",
    avatarUrl: null,
    createdAt: now,
  },
];

export const seedTrainings: Training[] = [
  {
    id: "training-fair-housing",
    title: "Fair Housing & Anti-Discrimination",
    description:
      "Required annual compliance training on fair housing law and practice.",
    content:
      "Review fair housing protected classes, advertising rules, and steering/blockbusting prohibitions. Complete the acknowledgement at the end.",
    url: null,
    category: "Compliance",
    requiredForRoles: ["master_admin", "high_level_user", "office_manager", "agent"],
    estimatedMinutes: 45,
    isActive: true,
  },
  {
    id: "training-new-agent-onboarding",
    title: "New Agent Onboarding",
    description:
      "Get set up with brokerage systems, branding, and your first 30 days.",
    content:
      "Covers CRM setup, brand assets, the transaction process, and who to call for help.",
    url: null,
    category: "Onboarding",
    requiredForRoles: ["agent"],
    estimatedMinutes: 60,
    isActive: true,
  },
  {
    id: "training-global-luxury",
    title: "Global Luxury Listing Marketing",
    description:
      "How to position and market luxury listings with the Global Luxury toolkit.",
    content: "Luxury branding standards, photography, and syndication.",
    url: "https://www.coldwellbankerluxury.com",
    category: "Marketing",
    requiredForRoles: [],
    estimatedMinutes: 30,
    isActive: true,
  },
  {
    id: "training-lead-followup",
    title: "Lead Follow-up Best Practices",
    description: "Convert more leads with a consistent follow-up cadence.",
    content: "Speed-to-lead, cadences, and CRM hygiene.",
    url: null,
    category: "Sales",
    requiredForRoles: ["agent", "office_manager"],
    estimatedMinutes: 25,
    isActive: true,
  },
];

export const seedAssignments: TrainingAssignment[] = [
  {
    id: "assign-1",
    profileId: "profile-agent",
    trainingId: "training-fair-housing",
    status: "completed",
    assignedAt: now,
    startedAt: now,
    completedAt: "2026-01-20T15:30:00.000Z",
    score: 96,
  },
  {
    id: "assign-2",
    profileId: "profile-agent",
    trainingId: "training-new-agent-onboarding",
    status: "in_progress",
    assignedAt: now,
    startedAt: "2026-02-01T10:00:00.000Z",
    completedAt: null,
    score: null,
  },
  {
    id: "assign-3",
    profileId: "profile-agent",
    trainingId: "training-lead-followup",
    status: "not_started",
    assignedAt: now,
    startedAt: null,
    completedAt: null,
    score: null,
  },
  {
    id: "assign-4",
    profileId: "profile-manager",
    trainingId: "training-fair-housing",
    status: "completed",
    assignedAt: now,
    startedAt: now,
    completedAt: "2026-01-18T12:00:00.000Z",
    score: 100,
  },
  {
    id: "assign-5",
    profileId: "profile-manager",
    trainingId: "training-lead-followup",
    status: "in_progress",
    assignedAt: now,
    startedAt: "2026-02-10T09:00:00.000Z",
    completedAt: null,
    score: null,
  },
  {
    id: "assign-6",
    profileId: "profile-agent-2",
    trainingId: "training-new-agent-onboarding",
    status: "completed",
    assignedAt: now,
    startedAt: now,
    completedAt: "2026-01-25T11:00:00.000Z",
    score: 88,
  },
];

// The mutable store. Cloned from seeds so mutations don't alter the registry.
export const store = {
  offices: seedOffices.map((o) => ({ ...o })),
  profiles: seedProfiles.map((p) => ({ ...p })),
  tools: SEED_TOOLS.map((t) => ({ ...t, roles: [...t.roles] })) as Tool[],
  trainings: seedTrainings.map((t) => ({
    ...t,
    requiredForRoles: [...t.requiredForRoles],
  })),
  assignments: seedAssignments.map((a) => ({ ...a })),
};
