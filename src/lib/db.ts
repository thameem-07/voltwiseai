import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "../db/schema";

const connectionString = process.env.DATABASE_URL;

export const isNeonConfigured = Boolean(
  connectionString &&
  (connectionString.startsWith("postgres://") || connectionString.startsWith("postgresql://"))
);

let dbInstance: ReturnType<typeof drizzle> | null = null;

if (isNeonConfigured) {
  try {
    const pool = new Pool({ connectionString });
    dbInstance = drizzle(pool, { schema });
  } catch (err) {
    console.warn("Neon database connection initialization failed, falling back to local store:", err);
    dbInstance = null;
  }
}

export const db = dbInstance;
