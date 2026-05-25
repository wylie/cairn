import { organizations } from "@/lib/mocks/organizations";
import { locations } from "@/lib/mocks/locations";

export interface ResolvedTenant {
  organizationId: string;
  organizationSlug: string;
  organizationName: string;
  allowedLocations: Array<{ id: string; name: string }>;
  currentLocationId: string;
}

export function resolveOrganizationBySlug(slug: string) {
  return organizations.find((org) => org.slug === slug) ?? null;
}

export function resolveTenant(slug: string): ResolvedTenant | null {
  const organization = resolveOrganizationBySlug(slug);
  if (!organization) return null;
  const orgLocations = locations.filter((entry) => entry.organizationId === organization.id && entry.active !== false);
  const fallback = orgLocations.find((entry) => entry.isDefault) ?? orgLocations[0];
  return {
    organizationId: organization.id,
    organizationSlug: organization.slug,
    organizationName: organization.name,
    allowedLocations: orgLocations.map((entry) => ({ id: entry.id, name: entry.name })),
    currentLocationId: fallback?.id ?? ""
  };
}
