import { resolveOrganizationBySlug } from "@/lib/tenant/resolve";
import { absoluteUrl } from "@/lib/metadata";
import { demoOrganizationSlugs } from "@/lib/mocks/organizations";
import { programs as seedPrograms, classCampSessions } from "@/lib/mocks/programs";
import { posProducts } from "@/lib/mocks/products";
import { registrations } from "@/lib/mocks/registrations";
import { locations } from "@/lib/mocks/locations";
import type { Program, ClassCampSession } from "@/types/domain";

export function getOrganizationForPublic(orgSlug: string) {
  return resolveOrganizationBySlug(orgSlug);
}

export function getPublicPrograms(orgSlug: string): Program[] {
  const org = resolveOrganizationBySlug(orgSlug);
  if (!org) return [];
  return seedPrograms.filter((entry) => entry.organizationId === org.id && entry.active !== false);
}

export function getPublicProgram(orgSlug: string, programId: string): Program | undefined {
  return getPublicPrograms(orgSlug).find((entry) => entry.id === programId);
}

export function getPublicSessionsForProgram(orgSlug: string, programId: string): ClassCampSession[] {
  const program = getPublicProgram(orgSlug, programId);
  if (!program) return [];
  return classCampSessions
    .filter((entry) => entry.programId === program.id && entry.status !== "cancelled")
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export function getPublicSession(orgSlug: string, sessionId: string): (ClassCampSession & { program?: Program }) | undefined {
  const session = classCampSessions.find((entry) => entry.id === sessionId && entry.status !== "cancelled");
  if (!session) return undefined;
  const program = getPublicProgram(orgSlug, session.programId);
  if (!program) return undefined;
  return { ...session, program };
}

export function getProgramPricing(program: Program) {
  const match = posProducts.find((product) => {
    if (product.organizationId !== program.organizationId) return false;
    if (program.category === "camp" && (product.category === "camps" || product.type === "camp")) return true;
    if ((program.category === "class" || program.category === "clinic") && (product.category === "classes" || product.type === "class")) return true;
    return false;
  });
  if (!match) return { memberCents: null as number | null, nonMemberCents: null as number | null };
  return {
    memberCents: match.memberPriceCents ?? null,
    nonMemberCents: match.nonMemberPriceCents ?? match.priceCents ?? null
  };
}

export function getSessionStats(session: ClassCampSession) {
  const registered = registrations.filter((entry) => entry.sessionId === session.id && entry.status !== "cancelled").length;
  const waitlisted = registrations.filter((entry) => entry.sessionId === session.id && entry.status === "waitlisted").length;
  const seededRegistered = Math.max(session.enrolled, registered);
  const spotsRemaining = Math.max(session.capacity - seededRegistered, 0);
  return {
    registered: seededRegistered,
    waitlisted: Math.max(session.waitlistCount ?? 0, waitlisted),
    spotsRemaining,
    full: spotsRemaining <= 0
  };
}

export function getLocationName(locationId?: string) {
  if (!locationId) return "Unassigned";
  return locations.find((entry) => entry.id === locationId)?.name ?? locationId;
}

export function getRegistrationStateForCustomer(sessionId: string, customerId?: string) {
  if (!customerId) return null;
  return registrations.find(
    (entry) =>
      entry.sessionId === sessionId &&
      entry.customerId === customerId &&
      entry.status !== "cancelled"
  ) ?? null;
}

export function getPublicProgramSitemapEntries(orgSlug: string) {
  const org = resolveOrganizationBySlug(orgSlug);
  if (!org) return { programs: [] as string[], sessions: [] as string[] };
  const orgPrograms = seedPrograms.filter((entry) => entry.organizationId === org.id && entry.active !== false);
  const programUrls = orgPrograms.map((entry) => absoluteUrl(`/p/${orgSlug}/programs/${entry.id}`));
  const sessionUrls = classCampSessions
    .filter((entry) => orgPrograms.some((program) => program.id === entry.programId) && entry.status !== "cancelled")
    .map((entry) => absoluteUrl(`/p/${orgSlug}/sessions/${entry.id}`));
  return { programs: programUrls, sessions: sessionUrls };
}

export function getPublicSitemapOrganizationSlugs() {
  return demoOrganizationSlugs;
}
