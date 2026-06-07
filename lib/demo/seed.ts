import { toDateKey } from "@/lib/demo/dates";
import { isDemoOrganizationId } from "@/lib/mocks/organizations";

export function getDemoSeedVersion(now = new Date()) {
  return toDateKey(now);
}

export function shouldRefreshDemoSeed(organizationId: string, storedVersion?: string | null, now = new Date()) {
  if (!isDemoOrganizationId(organizationId)) return false;
  return storedVersion !== getDemoSeedVersion(now);
}
