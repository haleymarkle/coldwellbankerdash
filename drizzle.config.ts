import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Match Next.js env loading so `drizzle-kit` picks up .env.local.
loadEnvConfig(process.cwd());

// Prefer the direct (unpooled) connection for migrations when available.
const url =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema",
  out: "./src/db/migrations",
  dbCredentials: { url },
  // Only manage OUR app schema; never touch Neon Auth-managed objects.
  schemaFilter: ["public"],
  verbose: true,
  strict: true,
});
