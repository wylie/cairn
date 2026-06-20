import { defineConfig } from "drizzle-kit";
import { loadDatabaseEnv } from "./db/env";

loadDatabaseEnv();

export default defineConfig({
  schema: "./db/schema/index.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? ""
  }
});
