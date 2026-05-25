import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const APP_DIR = path.join(process.cwd(), "app");

function collectFiles(dir: string, out: string[] = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(full, out);
    else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe("UI routes avoid direct mock seed imports", () => {
  it("does not import lib/mocks directly in app routes", () => {
    const files = collectFiles(APP_DIR);
    const offenders = files.filter((file) => fs.readFileSync(file, "utf8").includes("@/lib/mocks/"));
    expect(offenders).toEqual([]);
  });
});
