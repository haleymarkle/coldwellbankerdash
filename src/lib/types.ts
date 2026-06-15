// Shared domain types used across the data-access layer, auth, and UI.
// These are plain TS types (not Drizzle-inferred) so the in-memory dev store
// and the Drizzle/Neon production store both satisfy the same contract.

export type Role =
  | "master_admin"
  | "high_level_user"
  | "office_manager"
  | "agent";

export type UserStatus = "active" | "invited" | "disabled";

export type ToolType = "internal_route" | "external_link";

export type TrainingStatus = "not_started" | "in_progress" | "completed";

export interface Office {
  id: string;
  name: string;
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  region?: string | null;
  isActive: boolean;
}

export interface Profile {
  id: string;
  /** Neon Auth (Better Auth) user id — `session.user.id`. */
  userId: string;
  email: string;
  displayName: string;
  role: Role;
  status: UserStatus;
  officeId: string | null;
  title?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
}

export interface ProfileWithOffice extends Profile {
  officeName: string | null;
}

export interface Tool {
  id: string;
  slug: string;
  name: string;
  description: string;
  /** lucide-react icon name, e.g. "Calculator". */
  icon: string;
  type: ToolType;
  /** internal route ("/tools/loan-calculator") or external URL. */
  url: string;
  category: string;
  /** Roles allowed to see/use the tool. */
  roles: Role[];
  /** Optional office scoping — empty/undefined means all offices. */
  officeIds?: string[];
  sortOrder: number;
  isActive: boolean;
}

export interface Training {
  id: string;
  title: string;
  description: string;
  /** markdown/plain body for internal trainings. */
  content?: string | null;
  /** external video/course link. */
  url?: string | null;
  category: string;
  /** Roles this training is required for. */
  requiredForRoles: Role[];
  estimatedMinutes?: number | null;
  isActive: boolean;
}

export interface TrainingAssignment {
  id: string;
  profileId: string;
  trainingId: string;
  status: TrainingStatus;
  assignedAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  score?: number | null;
}

/** A training joined with the current user's assignment/progress. */
export interface TrainingWithProgress extends Training {
  assignment: TrainingAssignment | null;
}

/** The authenticated user resolved against their profile + office. */
export interface CurrentUser {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  officeId: string | null;
  officeName: string | null;
  title?: string | null;
  avatarUrl?: string | null;
}
