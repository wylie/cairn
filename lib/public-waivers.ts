import { waiverTemplates, waiverTemplateVersions } from "@/lib/mocks/waiver-templates";
import type { WaiverTemplate, WaiverTemplateVersion } from "@/types/domain";
import { resolveOrganizationBySlug } from "@/lib/tenant/resolve";

export function getPublicWaiverTemplate(orgSlug: string, waiverId: string): WaiverTemplate | undefined {
  const org = resolveOrganizationBySlug(orgSlug);
  if (!org) return undefined;
  return waiverTemplates.find((entry) => entry.id === waiverId && entry.organizationId === org.id);
}

export function getDefaultPublicWaiverTemplate(orgSlug: string): WaiverTemplate | undefined {
  const org = resolveOrganizationBySlug(orgSlug);
  if (!org) return undefined;
  return waiverTemplates.find((entry) => entry.organizationId === org.id && entry.active && !entry.archived);
}

export function getWaiverTemplateVersionById(versionId: string): WaiverTemplateVersion | undefined {
  return waiverTemplateVersions.find((entry) => entry.id === versionId);
}
