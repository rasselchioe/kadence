import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Lazily-initialized Drizzle client over the Supabase Postgres pooler.
 * `prepare: false` is required for the transaction-mode pooler (port 6543).
 * Lazy so the app builds without `DATABASE_URL` — it only throws when a query
 * actually runs server-side.
 */
let singleton: PostgresJsDatabase<typeof schema> | undefined;

export function getDb(): PostgresJsDatabase<typeof schema> {
  if (!singleton) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not set — add it to .env.local");
    }
    singleton = drizzle(postgres(url, { prepare: false }), { schema });
  }
  return singleton;
}

export { schema };
