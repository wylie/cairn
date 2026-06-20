import { loadEnvConfig } from "@next/env";

let loaded = false;

export function loadDatabaseEnv() {
  if (loaded) return;
  loadEnvConfig(process.cwd());
  loaded = true;
}
