// Canonical tool catalog. This is the seed source for the `tools` table and the
// list rendered in the Tools area. Adding a tool here (or, in production, a row in
// the `tools` table) makes it appear — no routing changes needed.
//
// - kind "internal_route": hosted inside this app at /tools/<slug>. Provide an entry
//   in INTERNAL_TOOL_SLUGS and a renderer in the tool host page.
// - kind "external_link": opens an external system (CRM, brand portals, etc.).

import type { Role, Tool } from "@/lib/types";
import { ROLES } from "@/lib/rbac";

const LEADERSHIP: Role[] = ["master_admin", "high_level_user"];
const MANAGERS: Role[] = ["master_admin", "high_level_user", "office_manager"];

export const TOOL_CATEGORIES = [
  "Transactions",
  "Marketing",
  "Sales",
  "Operations",
] as const;

export const SEED_TOOLS: Tool[] = [
  {
    id: "tool-commission-calculator",
    slug: "commission-calculator",
    name: "Commission Calculator",
    description:
      "Estimate gross commission, splits, and agent net for a sale price and rate.",
    icon: "Calculator",
    type: "internal_route",
    url: "/tools/commission-calculator",
    category: "Transactions",
    roles: ROLES,
    sortOrder: 10,
    isActive: true,
  },
  {
    id: "tool-transaction-checklist",
    slug: "transaction-checklist",
    name: "Transaction Checklist",
    description:
      "Step-by-step contract-to-close checklist to keep every deal on track.",
    icon: "ClipboardCheck",
    type: "internal_route",
    url: "/tools/transaction-checklist",
    category: "Transactions",
    roles: ROLES,
    sortOrder: 20,
    isActive: true,
  },
  {
    id: "tool-crm",
    slug: "crm",
    name: "Company CRM",
    description: "Manage leads, contacts, and your pipeline in the brokerage CRM.",
    icon: "Users",
    type: "external_link",
    url: "https://www.coldwellbanker.com",
    category: "Sales",
    roles: ROLES,
    sortOrder: 30,
    isActive: true,
  },
  {
    id: "tool-move-meter",
    slug: "move-meter",
    name: "Move Meter",
    description: "Compare locations by cost of living, jobs, and lifestyle for clients.",
    icon: "Map",
    type: "external_link",
    url: "https://www.coldwellbanker.com/move-meter",
    category: "Sales",
    roles: ROLES,
    sortOrder: 40,
    isActive: true,
  },
  {
    id: "tool-home-estimate",
    slug: "cb-estimate",
    name: "CB Estimate",
    description: "Pull a Coldwell Banker home value estimate to share with sellers.",
    icon: "Home",
    type: "external_link",
    url: "https://www.coldwellbanker.com/home-estimate",
    category: "Sales",
    roles: ROLES,
    sortOrder: 50,
    isActive: true,
  },
  {
    id: "tool-global-luxury",
    slug: "global-luxury",
    name: "Global Luxury Marketing",
    description: "Access the Coldwell Banker Global Luxury marketing and listing toolkit.",
    icon: "Gem",
    type: "external_link",
    url: "https://www.coldwellbankerluxury.com",
    category: "Marketing",
    roles: ROLES,
    sortOrder: 60,
    isActive: true,
  },
  {
    id: "tool-brand-assets",
    slug: "brand-assets",
    name: "Brand Asset Library",
    description: "Logos, templates, and approved marketing collateral for agents.",
    icon: "Images",
    type: "internal_route",
    url: "/tools/brand-assets",
    category: "Marketing",
    roles: ROLES,
    sortOrder: 70,
    isActive: true,
  },
  {
    id: "tool-office-reports",
    slug: "office-reports",
    name: "Office Reports",
    description: "Production, listings, and activity reporting for your office.",
    icon: "BarChart3",
    type: "internal_route",
    url: "/tools/office-reports",
    category: "Operations",
    roles: MANAGERS,
    sortOrder: 80,
    isActive: true,
  },
  {
    id: "tool-commission-plans",
    slug: "commission-plans",
    name: "Commission Plans",
    description: "Review and manage brokerage commission plans and caps.",
    icon: "Building2",
    type: "internal_route",
    url: "/tools/commission-plans",
    category: "Operations",
    roles: LEADERSHIP,
    sortOrder: 90,
    isActive: true,
  },
];

/** Slugs that are hosted internally and have a real renderer in v1. */
export const BUILT_INTERNAL_TOOL_SLUGS = ["commission-calculator"] as const;

export function isBuiltInternalTool(slug: string): boolean {
  return (BUILT_INTERNAL_TOOL_SLUGS as readonly string[]).includes(slug);
}
