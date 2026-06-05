"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  type OrganizationTemplateRecord,
  type PlatformOrganizationStatus,
  type ProvisionedOrganizationRecord,
  type ProvisioningFacilityType,
  PLATFORM_TEMPLATES,
  buildProvisionedOrganization,
  buildSeedProvisionedOrganizations,
  inferTemplateForFacilityType,
  readProvisionedOrganizationsClient,
  slugifyOrganizationName,
  writeProvisionedOrganizationsClient
} from "@/lib/platform-admin/registry";

type PlatformSettings = {
  supportEmail: string;
  defaultTrialDays: number;
  allowDemoResets: boolean;
  allowCustomDomains: boolean;
  whiteLabelReady: boolean;
};

type PlatformAdminContextValue = {
  organizations: ProvisionedOrganizationRecord[];
  templates: OrganizationTemplateRecord[];
  demoFacilities: ProvisionedOrganizationRecord[];
  platformSettings: PlatformSettings;
  createOrganization: (input: {
    name: string;
    slug: string;
    facilityType: ProvisioningFacilityType;
    primaryLocationName: string;
    ownerName: string;
    ownerEmail: string;
    primaryColor: string;
    secondaryColor: string;
    description?: string;
  }) => { ok: boolean; message: string; organization?: ProvisionedOrganizationRecord };
  updateOrganizationStatus: (slug: string, status: PlatformOrganizationStatus) => { ok: boolean; message: string };
  resetDemoFacility: (slug: string) => { ok: boolean; message: string };
};

const PLATFORM_SETTINGS_STORAGE_KEY = "cairn_platform_settings_v1";

const defaultPlatformSettings: PlatformSettings = {
  supportEmail: "platform@cairn.app",
  defaultTrialDays: 14,
  allowDemoResets: true,
  allowCustomDomains: false,
  whiteLabelReady: false
};

const PlatformAdminStateContext = createContext<PlatformAdminContextValue | null>(null);

export function PlatformAdminStateProvider({ children }: { children: React.ReactNode }) {
  const [organizations, setOrganizations] = useState<ProvisionedOrganizationRecord[]>(() => readProvisionedOrganizationsClient());
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(() => {
    if (typeof window === "undefined") return defaultPlatformSettings;
    const stored = window.localStorage.getItem(PLATFORM_SETTINGS_STORAGE_KEY);
    if (!stored) return defaultPlatformSettings;
    try {
      return { ...defaultPlatformSettings, ...(JSON.parse(stored) as Partial<PlatformSettings>) };
    } catch {
      return defaultPlatformSettings;
    }
  });

  useEffect(() => {
    writeProvisionedOrganizationsClient(organizations);
  }, [organizations]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PLATFORM_SETTINGS_STORAGE_KEY, JSON.stringify(platformSettings));
  }, [platformSettings]);

  const createOrganization: PlatformAdminContextValue["createOrganization"] = (input) => {
    const name = input.name.trim();
    const slug = slugifyOrganizationName(input.slug || input.name);
    if (!name) return { ok: false, message: "Organization name is required." };
    if (!slug) return { ok: false, message: "Organization slug is required." };
    if (organizations.some((entry) => entry.slug === slug)) {
      return { ok: false, message: "That organization slug already exists." };
    }
    if (!input.primaryLocationName.trim()) return { ok: false, message: "Primary location is required." };
    if (!input.ownerName.trim() || !input.ownerEmail.trim()) return { ok: false, message: "Owner account details are required." };

    const organization = buildProvisionedOrganization({
      ...input,
      name,
      slug
    });
    setOrganizations((prev) => [...prev, organization]);
    return { ok: true, message: `${organization.name} provisioned successfully.`, organization };
  };

  const updateOrganizationStatus: PlatformAdminContextValue["updateOrganizationStatus"] = (slug, status) => {
    const exists = organizations.some((entry) => entry.slug === slug);
    if (!exists) return { ok: false, message: "Organization not found." };
    setOrganizations((prev) => prev.map((entry) => (entry.slug === slug ? { ...entry, status } : entry)));
    return { ok: true, message: `Organization marked ${status}.` };
  };

  const resetDemoFacility: PlatformAdminContextValue["resetDemoFacility"] = (slug) => {
    const target = organizations.find((entry) => entry.slug === slug);
    if (!target?.isDemo || !target.isResettableDemo) {
      return { ok: false, message: "This organization is not resettable." };
    }
    const seeded = buildSeedProvisionedOrganizations().find((entry) => entry.slug === slug);
    if (!seeded) return { ok: false, message: "No demo seed exists for this organization." };
    setOrganizations((prev) => prev.map((entry) => (entry.slug === slug ? seeded : entry)));
    return { ok: true, message: `${seeded.name} reset to its demo baseline.` };
  };

  const value = useMemo<PlatformAdminContextValue>(
    () => ({
      organizations,
      templates: PLATFORM_TEMPLATES,
      demoFacilities: organizations.filter((entry) => entry.isDemo),
      platformSettings,
      createOrganization,
      updateOrganizationStatus,
      resetDemoFacility
    }),
    [organizations, platformSettings]
  );

  return <PlatformAdminStateContext.Provider value={value}>{children}</PlatformAdminStateContext.Provider>;
}

export function usePlatformAdminState() {
  const context = useContext(PlatformAdminStateContext);
  if (!context) throw new Error("usePlatformAdminState must be used within PlatformAdminStateProvider");
  return context;
}

export function getTemplatePreviewForFacilityType(facilityType: ProvisioningFacilityType) {
  return inferTemplateForFacilityType(facilityType);
}
