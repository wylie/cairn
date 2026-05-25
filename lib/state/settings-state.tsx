"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { data } from "@/lib/data";
import { buildScopedMockKey, loadMockState, saveMockState } from "@/lib/mock-storage";
import { ROLE_PERMISSION_PRESETS } from "@/lib/staff/permissions";
import type { FacilityProfile, Location, StaffPermission, StaffRoleDefinition, StaffUser } from "@/types/domain";

const SETTINGS_STORAGE_KEY = buildScopedMockKey("org_summit", "settings", "v1");
const DEFAULT_ORGANIZATION_NAME = "Summit Rec Collective";
const DEFAULT_ORGANIZATION_TIMEZONE = "America/New_York";
const defaultOrganization = data.organizations?.[0];

type MembershipAccessSettings = {
  defaultWaiverExpirationDays: number;
  householdGuardianRequiredUnderAge: number;
  allowGuestCheckIn: boolean;
  simultaneousAccessLimit: number;
  checkInGracePeriodMinutes: number;
  expirationWarningDays: number;
  expiredWaiverAction: "warn" | "block" | "manager_override";
  expiredMembershipAction: "warn" | "block" | "manager_override";
  missingGuardianAction: "warn" | "block" | "manager_override";
  unpaidAccountAction: "warn" | "block" | "manager_override";
};

type WaiverSettings = {
  activeWaiverVersion: string;
  effectiveDate: string;
  expirationDays: number;
  requireForMembership: boolean;
  requireForDayPass: boolean;
  requireForPunchPass: boolean;
  requireForPrograms: boolean;
  allowDigitalSignature: boolean;
  requireGuardianForMinors: boolean;
};

type PosPaymentSettings = {
  salesTaxPercent: number;
  taxableProductsByDefault: boolean;
  allowRefunds: boolean;
  allowComps: boolean;
  allowDiscounts: boolean;
  cashDrawerEnabled: boolean;
  receiptFooter: string;
  paymentMethods: Array<"cash" | "card" | "account_credit" | "comp" | "gift_card">;
};

type BrandingSettings = {
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  facilityNickname: string;
  darkModeLogoUrl: string;
};

type NotificationSettings = {
  waiverExpiring: boolean;
  membershipExpiring: boolean;
  staffInvited: boolean;
  registrationReminder: boolean;
  unpaidAccount: boolean;
  channels: {
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };
};

type AdvancedSettings = {
  strictRoleChecks: boolean;
  auditLogRetentionDays: number;
  requireReasonForOverrides: boolean;
};

type SettingsStateSnapshot = {
  facilityProfile: FacilityProfile & {
    legalBusinessName?: string;
    taxId?: string;
    currency: string;
    businessType: string;
    logoUrl?: string;
    description?: string;
    emergencyContact?: string;
  };
  locations: Location[];
  roleDefinitions: StaffRoleDefinition[];
  membershipAccess: MembershipAccessSettings;
  waiver: WaiverSettings;
  posPayments: PosPaymentSettings;
  branding: BrandingSettings;
  notifications: NotificationSettings;
  advanced: AdvancedSettings;
};

function mapRoleNameToSystemRoleId(name: string) {
  const normalized = name.trim().toLowerCase();
  if (normalized === "owner") return "owner";
  if (normalized === "manager") return "manager";
  if (normalized === "front desk") return "front_desk";
  if (normalized === "instructor / coach" || normalized === "instructor" || normalized === "coach") return "instructor";
  if (normalized === "volunteer") return "volunteer_limited";
  return null;
}

const defaultRoleDefinitions: StaffRoleDefinition[] = [
  {
    id: "role_owner",
    name: "Owner",
    description: "Full facility and system access.",
    color: "slate",
    permissions: ROLE_PERMISSION_PRESETS.owner,
    active: true,
    isSystem: true
  },
  {
    id: "role_manager",
    name: "Manager",
    description: "Operational management across staff, products, and programs.",
    color: "blue",
    permissions: ROLE_PERMISSION_PRESETS.manager,
    active: true,
    isSystem: true
  },
  {
    id: "role_front_desk",
    name: "Front Desk",
    description: "Daily check-in, POS, and customer operations.",
    color: "green",
    permissions: ROLE_PERMISSION_PRESETS.front_desk,
    active: true,
    isSystem: true
  },
  {
    id: "role_instructor",
    name: "Instructor / Coach",
    description: "Rosters and attendance for assigned sessions.",
    color: "purple",
    permissions: ROLE_PERMISSION_PRESETS.instructor,
    active: true,
    isSystem: true
  },
  {
    id: "role_volunteer",
    name: "Volunteer",
    description: "Limited roster and attendance support.",
    color: "gray",
    permissions: ROLE_PERMISSION_PRESETS.volunteer_limited,
    active: true,
    isSystem: true
  }
];

const defaultSettings: SettingsStateSnapshot = {
  facilityProfile: {
    organizationId: "org_summit",
    facilityName: defaultOrganization?.name ?? DEFAULT_ORGANIZATION_NAME,
    shortName: "SRC",
    legalBusinessName: "Summit Recreation Collective LLC",
    businessType: "Hybrid",
    phone: "(212) 555-1000",
    email: "ops@summitrec.co",
    website: "https://summitrec.co",
    addressLine1: "120 Spring St",
    city: "New York",
    state: "NY",
    postalCode: "10012",
    taxId: "",
    timezone: defaultOrganization?.timezone ?? DEFAULT_ORGANIZATION_TIMEZONE,
    currency: "USD",
    logoUrl: "",
    description: "Community-centered climbing and movement facility.",
    emergencyContact: "(212) 555-1999"
  },
  locations: (data.locations ?? []).map((entry, index) => ({
    ...entry,
    active: entry.active ?? true,
    isDefault: entry.isDefault ?? index === 0,
    capacity: entry.capacity ?? (entry.id === "loc_001" ? 240 : 180)
  })),
  roleDefinitions: defaultRoleDefinitions,
  membershipAccess: {
    defaultWaiverExpirationDays: 365,
    householdGuardianRequiredUnderAge: 18,
    allowGuestCheckIn: true,
    simultaneousAccessLimit: 1,
    checkInGracePeriodMinutes: 15,
    expirationWarningDays: 7,
    expiredWaiverAction: "block",
    expiredMembershipAction: "block",
    missingGuardianAction: "manager_override",
    unpaidAccountAction: "warn"
  },
  waiver: {
    activeWaiverVersion: "WAIVER-2026-01",
    effectiveDate: "2026-01-01",
    expirationDays: 365,
    requireForMembership: true,
    requireForDayPass: true,
    requireForPunchPass: true,
    requireForPrograms: true,
    allowDigitalSignature: true,
    requireGuardianForMinors: true
  },
  posPayments: {
    salesTaxPercent: 8.875,
    taxableProductsByDefault: false,
    allowRefunds: true,
    allowComps: true,
    allowDiscounts: true,
    cashDrawerEnabled: false,
    receiptFooter: "Thanks for supporting Summit Rec Collective.",
    paymentMethods: ["card", "cash", "comp", "gift_card"]
  },
  branding: {
    logoUrl: "",
    faviconUrl: "",
    primaryColor: "#0E9AC8",
    secondaryColor: "#1F2937",
    facilityNickname: "Summit",
    darkModeLogoUrl: ""
  },
  notifications: {
    waiverExpiring: true,
    membershipExpiring: true,
    staffInvited: true,
    registrationReminder: true,
    unpaidAccount: true,
    channels: {
      email: true,
      sms: false,
      inApp: true
    }
  },
  advanced: {
    strictRoleChecks: true,
    auditLogRetentionDays: 365,
    requireReasonForOverrides: true
  }
};

type SettingsContextValue = {
  settings: SettingsStateSnapshot;
  activeLocationId: string;
  setActiveLocationId: (locationId: string) => void;
  updateFacilityProfile: (patch: Partial<SettingsStateSnapshot["facilityProfile"]>) => void;
  addLocation: (input: Omit<Location, "id" | "organizationId">) => { ok: boolean; message: string };
  updateLocation: (locationId: string, patch: Partial<Location>) => { ok: boolean; message: string };
  archiveLocation: (locationId: string) => { ok: boolean; message: string };
  setDefaultLocation: (locationId: string) => { ok: boolean; message: string };
  createRole: (input: { name: string; description?: string; color?: string; permissions: StaffPermission[]; active?: boolean }) => { ok: boolean; message: string; roleId?: string };
  updateRole: (roleId: string, patch: Partial<StaffRoleDefinition>) => { ok: boolean; message: string };
  duplicateRole: (roleId: string) => { ok: boolean; message: string; roleId?: string };
  archiveRole: (roleId: string, staffUsers?: StaffUser[]) => { ok: boolean; message: string };
  deleteRole: (roleId: string, staffUsers?: StaffUser[]) => { ok: boolean; message: string };
  updateMembershipAccess: (patch: Partial<MembershipAccessSettings>) => void;
  updateWaiverSettings: (patch: Partial<WaiverSettings>) => void;
  updatePosPayments: (patch: Partial<PosPaymentSettings>) => void;
  updateBranding: (patch: Partial<BrandingSettings>) => void;
  updateNotifications: (patch: Partial<NotificationSettings>) => void;
  updateAdvanced: (patch: Partial<AdvancedSettings>) => void;
};

const SettingsStateContext = createContext<SettingsContextValue | null>(null);

export function SettingsStateProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SettingsStateSnapshot>(() => {
    const stored = loadMockState<{
      settings: SettingsStateSnapshot;
      activeLocationId: string;
    } | null>(SETTINGS_STORAGE_KEY, null);
    return stored?.settings ?? defaultSettings;
  });
  const [activeLocationId, setActiveLocationIdState] = useState<string>(() => {
    const stored = loadMockState<{
      settings: SettingsStateSnapshot;
      activeLocationId: string;
    } | null>(SETTINGS_STORAGE_KEY, null);
    return (
      stored?.activeLocationId ??
      stored?.settings?.locations.find((entry) => entry.isDefault)?.id ??
      defaultSettings.locations.find((entry) => entry.isDefault)?.id ??
      defaultSettings.locations[0]?.id ??
      "loc_001"
    );
  });

  useEffect(() => {
    saveMockState(SETTINGS_STORAGE_KEY, { settings, activeLocationId });
  }, [settings, activeLocationId]);

  const setActiveLocationId = (locationId: string) => setActiveLocationIdState(locationId);

  const applySettings = (updater: (previous: SettingsStateSnapshot) => SettingsStateSnapshot) => {
    setSettings((previous) => {
      const next = updater(previous);
      saveMockState(SETTINGS_STORAGE_KEY, { settings: next, activeLocationId });
      return next;
    });
  };

  const updateFacilityProfile = (patch: Partial<SettingsStateSnapshot["facilityProfile"]>) => {
    applySettings((prev) => ({ ...prev, facilityProfile: { ...prev.facilityProfile, ...patch } }));
  };

  const addLocation: SettingsContextValue["addLocation"] = (input) => {
    if (!input.name.trim()) return { ok: false, message: "Location name is required." };
    if (!input.city.trim() || !input.state.trim()) return { ok: false, message: "City and state are required." };
    const id = `loc_${Math.random().toString(36).slice(2, 8)}`;
    applySettings((prev) => ({
      ...prev,
      locations: [
        ...prev.locations,
        {
          ...input,
          id,
          organizationId: prev.facilityProfile.organizationId,
          active: input.active ?? true,
          isDefault: input.isDefault ?? false
        }
      ]
    }));
    return { ok: true, message: `Location added: ${input.name}.` };
  };

  const updateLocation: SettingsContextValue["updateLocation"] = (locationId, patch) => {
    const exists = settings.locations.some((entry) => entry.id === locationId);
    if (!exists) return { ok: false, message: "Location not found." };
    applySettings((prev) => ({
      ...prev,
      locations: prev.locations.map((entry) => (entry.id === locationId ? { ...entry, ...patch } : entry))
    }));
    return { ok: true, message: "Location updated." };
  };

  const archiveLocation: SettingsContextValue["archiveLocation"] = (locationId) => {
    const target = settings.locations.find((entry) => entry.id === locationId);
    if (!target) return { ok: false, message: "Location not found." };
    if (target.isDefault) return { ok: false, message: "Default location cannot be archived." };
    applySettings((prev) => ({
      ...prev,
      locations: prev.locations.map((entry) => (entry.id === locationId ? { ...entry, active: false } : entry))
    }));
    if (activeLocationId === locationId) {
      const fallback = settings.locations.find((entry) => entry.active && entry.id !== locationId)?.id;
      if (fallback) setActiveLocationIdState(fallback);
    }
    return { ok: true, message: `${target.name} archived.` };
  };

  const setDefaultLocation: SettingsContextValue["setDefaultLocation"] = (locationId) => {
    const target = settings.locations.find((entry) => entry.id === locationId);
    if (!target) return { ok: false, message: "Location not found." };
    applySettings((prev) => ({
      ...prev,
      locations: prev.locations.map((entry) => ({
        ...entry,
        isDefault: entry.id === locationId
      }))
    }));
    setActiveLocationIdState(locationId);
    return { ok: true, message: `${target.name} set as default location.` };
  };

  const createRole: SettingsContextValue["createRole"] = (input) => {
    const name = input.name.trim();
    if (!name) return { ok: false, message: "Role name is required." };
    if (settings.roleDefinitions.some((entry) => entry.name.toLowerCase() === name.toLowerCase())) {
      return { ok: false, message: "A role with that name already exists." };
    }
    const id = `role_custom_${Math.random().toString(36).slice(2, 8)}`;
    applySettings((prev) => ({
      ...prev,
      roleDefinitions: [
        ...prev.roleDefinitions,
        {
          id,
          name,
          description: input.description?.trim() || "",
          color: input.color || "slate",
          permissions: Array.from(new Set(input.permissions)),
          active: input.active ?? true,
          isSystem: false
        }
      ]
    }));
    return { ok: true, message: `Role created: ${name}.`, roleId: id };
  };

  const updateRole: SettingsContextValue["updateRole"] = (roleId, patch) => {
    const existing = settings.roleDefinitions.find((entry) => entry.id === roleId);
    if (!existing) return { ok: false, message: "Role not found." };
    if (existing.isSystem && patch.active === false) return { ok: false, message: "System roles cannot be deactivated." };

    if (existing.isSystem && existing.name === "Owner" && patch.permissions) {
      const next = patch.permissions;
      const required: StaffPermission[] = ["manageSettings", "manageStaff", "manageRoles"];
      if (required.some((permission) => !next.includes(permission))) {
        return { ok: false, message: "Owner role must retain core owner permissions." };
      }
    }

    applySettings((prev) => ({
      ...prev,
      roleDefinitions: prev.roleDefinitions.map((entry) =>
        entry.id === roleId
          ? {
              ...entry,
              ...patch,
              permissions: patch.permissions ? Array.from(new Set(patch.permissions)) : entry.permissions
            }
          : entry
      )
    }));
    return { ok: true, message: "Role updated." };
  };

  const duplicateRole: SettingsContextValue["duplicateRole"] = (roleId) => {
    const source = settings.roleDefinitions.find((entry) => entry.id === roleId);
    if (!source) return { ok: false, message: "Role not found." };
    const base = `${source.name} Copy`;
    let name = base;
    let index = 2;
    while (settings.roleDefinitions.some((entry) => entry.name.toLowerCase() === name.toLowerCase())) {
      name = `${base} ${index}`;
      index += 1;
    }
    const id = `role_custom_${Math.random().toString(36).slice(2, 8)}`;
    applySettings((prev) => ({
      ...prev,
      roleDefinitions: [
        ...prev.roleDefinitions,
        {
          ...source,
          id,
          name,
          color: source.color || "slate",
          isSystem: false,
          active: true
        }
      ]
    }));
    return { ok: true, message: `Role duplicated: ${name}.`, roleId: id };
  };

  const archiveRole: SettingsContextValue["archiveRole"] = (roleId, staffUsers = []) => {
    const role = settings.roleDefinitions.find((entry) => entry.id === roleId);
    if (!role) return { ok: false, message: "Role not found." };
    if (role.isSystem) return { ok: false, message: "System roles cannot be archived." };

    const linkedSystemRole = mapRoleNameToSystemRoleId(role.name);
    if (linkedSystemRole && staffUsers.some((staff) => staff.role === linkedSystemRole)) {
      return { ok: false, message: "Role is currently assigned to staff and cannot be archived." };
    }

    applySettings((prev) => ({
      ...prev,
      roleDefinitions: prev.roleDefinitions.map((entry) => (entry.id === roleId ? { ...entry, active: false } : entry))
    }));
    return { ok: true, message: `${role.name} archived.` };
  };

  const deleteRole: SettingsContextValue["deleteRole"] = (roleId, staffUsers = []) => {
    const role = settings.roleDefinitions.find((entry) => entry.id === roleId);
    if (!role) return { ok: false, message: "Role not found." };
    if (role.isSystem) return { ok: false, message: "System roles cannot be deleted." };

    const linkedSystemRole = mapRoleNameToSystemRoleId(role.name);
    if (linkedSystemRole && staffUsers.some((staff) => staff.role === linkedSystemRole)) {
      return { ok: false, message: "Role is currently assigned to staff and cannot be deleted." };
    }

    applySettings((prev) => ({
      ...prev,
      roleDefinitions: prev.roleDefinitions.filter((entry) => entry.id !== roleId)
    }));
    return { ok: true, message: `${role.name} deleted.` };
  };

  const updateMembershipAccess = (patch: Partial<MembershipAccessSettings>) => {
    applySettings((prev) => ({ ...prev, membershipAccess: { ...prev.membershipAccess, ...patch } }));
  };
  const updateWaiverSettings = (patch: Partial<WaiverSettings>) => {
    applySettings((prev) => ({ ...prev, waiver: { ...prev.waiver, ...patch } }));
  };
  const updatePosPayments = (patch: Partial<PosPaymentSettings>) => {
    applySettings((prev) => ({ ...prev, posPayments: { ...prev.posPayments, ...patch } }));
  };
  const updateBranding = (patch: Partial<BrandingSettings>) => {
    applySettings((prev) => ({ ...prev, branding: { ...prev.branding, ...patch } }));
  };
  const updateNotifications = (patch: Partial<NotificationSettings>) => {
    applySettings((prev) => ({ ...prev, notifications: { ...prev.notifications, ...patch } }));
  };
  const updateAdvanced = (patch: Partial<AdvancedSettings>) => {
    applySettings((prev) => ({ ...prev, advanced: { ...prev.advanced, ...patch } }));
  };

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      activeLocationId,
      setActiveLocationId,
      updateFacilityProfile,
      addLocation,
      updateLocation,
      archiveLocation,
      setDefaultLocation,
      createRole,
      updateRole,
      duplicateRole,
      archiveRole,
      deleteRole,
      updateMembershipAccess,
      updateWaiverSettings,
      updatePosPayments,
      updateBranding,
      updateNotifications,
      updateAdvanced
    }),
    [settings, activeLocationId]
  );

  return <SettingsStateContext.Provider value={value}>{children}</SettingsStateContext.Provider>;
}

export function useSettingsState() {
  const context = useContext(SettingsStateContext);
  if (!context) throw new Error("useSettingsState must be used inside SettingsStateProvider");
  return context;
}
