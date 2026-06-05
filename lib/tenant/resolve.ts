import { organizations } from "@/lib/mocks/organizations";
import { locations } from "@/lib/mocks/locations";
import { resolveRuntimeOrganizationBySlugClient } from "@/lib/platform-admin/registry";

export interface ResolvedTenant {
  organizationId: string;
  organizationSlug: string;
  organizationName: string;
  allowedLocations: Array<{ id: string; name: string }>;
  currentLocationId: string;
}

export function resolveOrganizationBySlug(slug: string) {
  if (typeof document !== "undefined") {
    return resolveRuntimeOrganizationBySlugClient(slug) ?? organizations.find((org) => org.slug === slug) ?? null;
  }
  return organizations.find((org) => org.slug === slug) ?? null;
}

export function resolveTenant(slug: string): ResolvedTenant | null {
  const organization = resolveOrganizationBySlug(slug);
  if (!organization) return null;
  const orgLocations = locations.filter((entry) => entry.organizationId === organization.id && entry.active !== false);
  const runtimeLocationName =
    typeof document !== "undefined" ? resolveRuntimeOrganizationBySlugClient(slug)?.primaryLocationName?.trim() : undefined;
  const synthesizedLocations =
    orgLocations.length === 0 && runtimeLocationName
      ? [
          {
            id: `loc_${organization.slug}_primary`,
            name: runtimeLocationName
          }
        ]
      : [];
  const allowedLocations =
    orgLocations.length > 0
      ? orgLocations.map((entry) => ({ id: entry.id, name: entry.name }))
      : synthesizedLocations;
  const fallback = orgLocations.find((entry) => entry.isDefault) ?? orgLocations[0];
  const fallbackLocationId = fallback?.id ?? synthesizedLocations[0]?.id ?? "";
  return {
    organizationId: organization.id,
    organizationSlug: organization.slug,
    organizationName: organization.name,
    allowedLocations,
    currentLocationId: fallbackLocationId
  };
}
