import "server-only";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "@/db/schema";

/** True when a Neon/Postgres connection is configured (production path). */
export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

// Lazily create a single Drizzle client. Safe to import even when DATABASE_URL
// is unset (dev) — `db` is only dereferenced by the production query path.
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. The in-memory dev store should be used instead."
    );
  }
  if (!_db) {
    const sql = neon(process.env.DATABASE_URL);
    _db = drizzle(sql, { schema });
  }
  return _db;
}
