// Production seed script — run with `npm run db:seed` (tsx) AFTER `db:migrate`.
// NOT used in dev (dev uses the in-memory store in src/lib/data/seed-data.ts).
//
// What it inserts (idempotently, via onConflictDoNothing where sensible):
//   • two offices (Sioux City HQ + North Sioux City)
//   • the SEED_TOOLS catalog (+ a tool_role_access row per allowed role)
//   • the same trainings used in dev
//   • a bootstrap master_admin profile keyed to BOOTSTRAP_ADMIN_USER_ID
//
// Run order at deploy:
//   1) sign in once as the first admin so a Neon Auth user exists
//   2) put that user's id in BOOTSTRAP_ADMIN_USER_ID
//   3) npm run db:generate && npm run db:migrate && npm run db:seed
//
// NOTE: We build the Drizzle client locally here instead of importing
// `@/lib/data/db` (getDb) because that module is tagged `import "server-only"`,
// which throws outside Next's bundler (i.e. under plain tsx). Schema tables are
// safe to import directly (pure drizzle-orm/pg-core). See README/AGENTS.md.

import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

import * as schema from "@/db/schema";
import { SEED_TOOLS } from "@/lib/tools-registry";
import type { Role } from "@/lib/types";

// Match Next's env loading so .env.local is picked up just like the app.
loadEnvConfig(process.cwd());

const {
  offices,
  profiles,
  tools,
  toolRoleAccess,
  trainings,
} = schema;

// Prefer the direct/unpooled connection for one-shot scripts, fall back to pooled.
const connectionString =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "";

if (!connectionString) {
  console.error(
    "[seed] DATABASE_URL (or DATABASE_URL_UNPOOLED) is not set. " +
      "This script seeds the production Neon database — set your env vars first."
  );
  process.exit(1);
}

const db = drizzle(neon(connectionString), { schema });

// --- Office seed data (mirrors src/lib/data/seed-data.ts) -------------------
const officeSeed = [
  {
    name: "Associated Brokers Realty — Sioux City",
    addressLine1: "1222 Pierce Street",
    city: "Sioux City",
    state: "IA",
    postalCode: "51105",
    region: "Siouxland",
    isActive: true,
  },
  {
    name: "Associated Brokers Realty — North Sioux",
    addressLine1: "100 River Drive",
    city: "North Sioux City",
    state: "SD",
    postalCode: "57049",
    region: "Siouxland",
    isActive: true,
  },
];

// --- Training seed data (mirrors seedTrainings in seed-data.ts) -------------
const trainingSeed = [
  {
    title: "Fair Housing & Anti-Discrimination",
    description:
      "Required annual compliance training on fair housing law and practice.",
    content:
      "Review fair housing protected classes, advertising rules, and steering/blockbusting prohibitions. Complete the acknowledgement at the end.",
    url: null,
    category: "Compliance",
    requiredForRoles: [
      "master_admin",
      "high_level_user",
      "office_manager",
      "agent",
    ] as Role[],
    estimatedMinutes: 45,
    isActive: true,
  },
  {
    title: "New Agent Onboarding",
    description:
      "Get set up with brokerage systems, branding, and your first 30 days.",
    content:
      "Covers CRM setup, brand assets, the transaction process, and who to call for help.",
    url: null,
    category: "Onboarding",
    requiredForRoles: ["agent"] as Role[],
    estimatedMinutes: 60,
    isActive: true,
  },
  {
    title: "Global Luxury Listing Marketing",
    description:
      "How to position and market luxury listings with the Global Luxury toolkit.",
    content: "Luxury branding standards, photography, and syndication.",
    url: "https://www.coldwellbankerluxury.com",
    category: "Marketing",
    requiredForRoles: [] as Role[],
    estimatedMinutes: 30,
    isActive: true,
  },
  {
    title: "Lead Follow-up Best Practices",
    description: "Convert more leads with a consistent follow-up cadence.",
    content: "Speed-to-lead, cadences, and CRM hygiene.",
    url: null,
    category: "Sales",
    requiredForRoles: ["agent", "office_manager"] as Role[],
    estimatedMinutes: 25,
    isActive: true,
  },
];

async function seedOffices(): Promise<string> {
  console.log("[seed] Offices…");
  for (const office of officeSeed) {
    await db.insert(offices).values(office).onConflictDoNothing();
  }
  // Resolve the HQ office id for the bootstrap admin's profile.
  const hq = await db.query.offices.findFirst({
    where: (o, { eq }) => eq(o.name, officeSeed[0].name),
  });
  console.log(`[seed]   ${officeSeed.length} offices ensured.`);
  return hq?.id ?? "";
}

async function seedTools(): Promise<void> {
  console.log("[seed] Tools + role access…");
  for (const tool of SEED_TOOLS) {
    // Insert the tool (unique on slug) and read back its id so we can map roles.
    await db
      .insert(tools)
      .values({
        slug: tool.slug,
        name: tool.name,
        description: tool.description,
        icon: tool.icon,
        type: tool.type,
        url: tool.url,
        category: tool.category,
        sortOrder: tool.sortOrder,
        isActive: tool.isActive,
      })
      .onConflictDoNothing({ target: tools.slug });

    const row = await db.query.tools.findFirst({
      where: (t, { eq }) => eq(t.slug, tool.slug),
    });
    if (!row) continue;

    for (const role of tool.roles) {
      await db
        .insert(toolRoleAccess)
        .values({ toolId: row.id, role })
        .onConflictDoNothing();
    }
  }
  console.log(`[seed]   ${SEED_TOOLS.length} tools ensured.`);
}

async function seedTrainings(): Promise<void> {
  console.log("[seed] Trainings…");
  for (const training of trainingSeed) {
    // No natural unique key on trainings; only insert if the title is new so the
    // script stays idempotent across re-runs.
    const existing = await db.query.trainings.findFirst({
      where: (t, { eq }) => eq(t.title, training.title),
    });
    if (existing) continue;
    await db.insert(trainings).values(training);
  }
  console.log(`[seed]   ${trainingSeed.length} trainings ensured.`);
}

// Dev stub profiles — these userId values match DEV_USER_IDS in seed-data.ts
// so the dev sign-in (no NEON_AUTH_COOKIE_SECRET) works against the real DB.
const devProfileSeed = [
  {
    userId: "dev-master_admin",
    email: "haleymarkle@gmail.com",
    displayName: "Haley Markle",
    role: "master_admin" as Role,
    status: "active" as const,
    title: "Broker / Owner",
  },
  {
    userId: "dev-high_level_user",
    email: "haley@cbabr.com",
    displayName: "Haley Markle",
    role: "high_level_user" as Role,
    status: "active" as const,
    title: "Broker / Owner",
  },
  {
    userId: "dev-office_manager",
    email: "dana@cbabr.com",
    displayName: "Dana Kruselenz",
    role: "office_manager" as Role,
    status: "active" as const,
    title: "Office Manager",
  },
  {
    userId: "dev-agent",
    email: "katie@cbabr.com",
    displayName: "Katie Irwin",
    role: "agent" as Role,
    status: "active" as const,
    title: "Sales Associate",
  },
];

async function seedDevProfiles(hqOfficeId: string): Promise<void> {
  console.log("[seed] Dev stub profiles…");
  for (const p of devProfileSeed) {
    await db
      .insert(profiles)
      .values({ ...p, officeId: hqOfficeId || null })
      .onConflictDoNothing({ target: profiles.userId });
  }
  console.log(`[seed]   ${devProfileSeed.length} dev profiles ensured.`);
}

async function seedBootstrapAdmin(hqOfficeId: string): Promise<void> {
  const adminUserId = process.env.BOOTSTRAP_ADMIN_USER_ID;
  if (!adminUserId) {
    console.log(
      "[seed] BOOTSTRAP_ADMIN_USER_ID not set — skipping bootstrap admin. " +
        "Sign in once, then set it to that user's auth id and re-run db:seed."
    );
    return;
  }
  console.log(`[seed] Bootstrap master_admin (userId=${adminUserId})…`);
  await db
    .insert(profiles)
    .values({
      userId: adminUserId,
      email: "haleymarkle@gmail.com",
      displayName: "Haley Markle",
      role: "master_admin",
      status: "active",
      officeId: hqOfficeId || null,
      title: "Broker / Owner",
    })
    .onConflictDoNothing({ target: profiles.userId });
  console.log("[seed]   bootstrap admin ensured.");
}

async function main(): Promise<void> {
  console.log("[seed] Seeding Coldwell Banker Hub database…");
  const hqOfficeId = await seedOffices();
  await seedTools();
  await seedTrainings();
  await seedDevProfiles(hqOfficeId);
  await seedBootstrapAdmin(hqOfficeId);
  console.log("[seed] Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});
