// CRM domain types, option labels, and pure helpers. No DOM/React, so these can
// run on client or server.

export type ContactType =
  | "buyer_lead"
  | "seller_lead"
  | "active_client"
  | "past_client"
  | "referral_sphere";

export type ContactStage =
  | "new"
  | "working"
  | "under_contract"
  | "closed"
  | "past_client";

export type ContactSource =
  | "office_call"
  | "soi"
  | "redfin"
  | "zillow_realtor"
  | "website"
  | "referral"
  | "cb_corporate"
  | "other";

export interface Contact {
  id: string;
  ownerAgentId: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: ContactType;
  stage: ContactStage | null;
  source: ContactSource;
  nextAction: string | null;
  /** ISO date (yyyy-mm-dd) or null. */
  nextActionDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContactActivity {
  id: string;
  contactId: string;
  /** ISO date (yyyy-mm-dd). */
  date: string;
  note: string;
  author: string;
  createdAt: string;
}

/** A contact joined with its owner's display name (for broker/admin views). */
export interface ContactWithOwner extends Contact {
  ownerName: string | null;
}

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  buyer_lead: "Buyer Lead",
  seller_lead: "Seller Lead",
  active_client: "Active Client",
  past_client: "Past Client",
  referral_sphere: "Referral / Sphere",
};

export const CONTACT_STAGE_LABELS: Record<ContactStage, string> = {
  new: "New",
  working: "Working",
  under_contract: "Under Contract",
  closed: "Closed",
  past_client: "Past Client",
};

export const CONTACT_SOURCE_LABELS: Record<ContactSource, string> = {
  office_call: "Office Call",
  soi: "Sphere of Influence",
  redfin: "Redfin",
  zillow_realtor: "Zillow / Realtor.com",
  website: "Website",
  referral: "Referral",
  cb_corporate: "CB Corporate",
  other: "Other",
};

export const CONTACT_TYPES = Object.keys(CONTACT_TYPE_LABELS) as ContactType[];
export const CONTACT_STAGES = Object.keys(CONTACT_STAGE_LABELS) as ContactStage[];
export const CONTACT_SOURCES = Object.keys(CONTACT_SOURCE_LABELS) as ContactSource[];

/** Pipeline columns, in board order. Referrals/sphere live outside the board. */
export const PIPELINE_STAGES: ContactStage[] = [
  "new",
  "working",
  "under_contract",
  "closed",
];

export type ContactFilter = "all" | "leads" | "active" | "past" | "referrals";

export const CONTACT_FILTER_LABELS: Record<ContactFilter, string> = {
  all: "All",
  leads: "Leads",
  active: "Active",
  past: "Past clients",
  referrals: "Referrals",
};

/** Today's date as an ISO yyyy-mm-dd string (local time). */
export function todayIso(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

/** True when a next-action date is today or in the past (i.e. due). */
export function isDue(dateIso: string | null, today: string = todayIso()): boolean {
  if (!dateIso) return false;
  return dateIso <= today;
}

/** True when a next-action date is strictly before today (overdue). */
export function isOverdue(dateIso: string | null, today: string = todayIso()): boolean {
  if (!dateIso) return false;
  return dateIso < today;
}

/** Whether a contact matches one of the list filter chips. */
export function matchesFilter(contact: Contact, filter: ContactFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "leads":
      return contact.type === "buyer_lead" || contact.type === "seller_lead";
    case "active":
      return contact.type === "active_client";
    case "past":
      return contact.type === "past_client";
    case "referrals":
      return contact.type === "referral_sphere";
    default:
      return true;
  }
}

/** Case-insensitive search across name, email, and phone. */
export function matchesSearch(contact: Contact, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    contact.name.toLowerCase().includes(q) ||
    (contact.email?.toLowerCase().includes(q) ?? false) ||
    (contact.phone?.toLowerCase().includes(q) ?? false)
  );
}

/** Format an ISO date for display, e.g. "Mar 5, 2026". Empty string if null. */
export function formatDate(dateIso: string | null): string {
  if (!dateIso) return "";
  const [y, m, d] = dateIso.split("-").map(Number);
  if (!y || !m || !d) return dateIso;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
