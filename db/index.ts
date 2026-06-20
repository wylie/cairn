import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import { loadDatabaseEnv } from "./env";
import * as schema from "./schema";

export * from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

let sqlClient: Sql | null = null;
let database: Database | null = null;

export function getDatabaseUrl() {
  loadDatabaseEnv();
  return process.env.DATABASE_URL?.trim() || null;
}

export function getSqlClient() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) return null;
  sqlClient ??= postgres(databaseUrl, {
    max: 1,
    prepare: false
  });
  return sqlClient;
}

export function getDatabase() {
  const client = getSqlClient();
  if (!client) return null;
  database ??= drizzle(client, { schema });
  return database;
}

export const db = getDatabase();
