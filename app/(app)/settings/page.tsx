"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckboxField, FormField, FormGrid, SelectInput, TextInput, TextareaInput } from "@/components/shared/form-layout";
import { FileUploadField } from "@/components/shared/file-upload-field";
import { ColorPickerField, normalizeHexColor } from "@/components/shared/color-picker-field";
import { ModalShell } from "@/components/ui/modal-shell";
import { PermissionGate } from "@/components/staff/permission-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSettingsState } from "@/lib/state/settings-state";
import { useWorkstationState } from "@/lib/state/workstation-state";
import { formatFacilitiesIncluded, getPlanName, getSupportTierName } from "@/lib/business-model";
import { PERMISSION_DESCRIPTIONS, PERMISSION_LABELS } from "@/lib/staff/permissions";
import { CAIRN_RELEASE_DATE, CAIRN_RELEASE_STATUS, CAIRN_VERSION } from "@/lib/version";
import type { Location, StaffPermission, StaffRole, StaffRoleDefinition } from "@/types/domain";

type SettingsSection =
  | "facility"
  | "locations"
  | "staff_roles"
  | "permissions"
  | "billing"
  | "membership_access"
  | "waivers"
  | "pos_payments"
  | "branding"
  | "notifications"
  | "advanced";

const settingsSections: Array<{ id: SettingsSection; label: string }> = [
  { id: "facility", label: "Facility" },
  { id: "locations", label: "Locations" },
  { id: "staff_roles", label: "Staff Roles" },
  { id: "permissions", label: "Permissions" },
  { id: "billing", label: "Billing" },
  { id: "membership_access", label: "Membership & Access" },
  { id: "waivers", label: "Waivers" },
  { id: "pos_payments", label: "POS & Payments" },
  { id: "branding", label: "Branding" },
  { id: "notifications", label: "Notifications" },
  { id: "advanced", label: "System Controls" }
];

const roleColorOptions = [
  { value: "slate", label: "Slate" },
  { value: "blue", label: "Blue" },
  { value: "green", label: "Green" },
  { value: "amber", label: "Amber" },
  { value: "purple", label: "Purple" },
  { value: "orange", label: "Orange" },
  { value: "red", label: "Red" },
  { value: "gray", label: "Gray" }
] as const;

const timezoneOptions = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu"
] as const;

const dateFormatOptions = ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD", "Month D, YYYY"] as const;
const timeFormatOptions = ["12-hour", "24-hour"] as const;

const roleColorChipClass: Record<string, string> = {
  slate: "border-slate-300 bg-slate-100 text-slate-800",
  blue: "border-sky-300 bg-sky-100 text-sky-800",
  green: "border-emerald-300 bg-emerald-100 text-emerald-800",
  amber: "border-amber-300 bg-amber-100 text-amber-900",
  purple: "border-violet-300 bg-violet-100 text-violet-800",
  orange: "border-orange-300 bg-orange-100 text-orange-800",
  red: "border-rose-300 bg-rose-100 text-rose-800",
  gray: "border-zinc-300 bg-zinc-100 text-zinc-800"
};

function mapRoleNameToStaffRole(name: string): StaffRole | null {
  const normalized = name.trim().toLowerCase();
  if (normalized === "owner") return "owner";
  if (normalized === "manager") return "manager";
  if (normalized === "front desk") return "front_desk";
  if (normalized === "instructor / coach" || normalized === "instructor" || normalized === "coach") return "instructor";
  if (normalized === "volunteer") return "volunteer_limited";
  return null;
}

const permissionGroups: Array<{ label: string; permissions: StaffPermission[] }> = [
  { label: "Customers", permissions: ["viewCustomers", "editCustomer", "createCustomer", "mergeCustomer", "deactivateCustomer"] },
  { label: "Check-in", permissions: ["checkInCustomer", "checkOutCustomer", "overrideAccess", "compAccess"] },
  { label: "POS", permissions: ["usePOS", "refundTransaction", "discountTransaction"] },
  { label: "Products", permissions: ["manageProducts", "deactivateProduct"] },
  { label: "Programs", permissions: ["editPrograms", "cancelPrograms", "rosterAccess"] },
  { label: "Communications", permissions: ["manageCommunications", "sendTransactionalMessages", "messageAssignedParticipants"] },
  { label: "Reports", permissions: ["viewReports", "viewAttendanceReports", "viewFinancialReports", "viewMembershipReports"] },
  { label: "Staff", permissions: ["manageStaff", "inviteStaff", "manageRoles"] },
  { label: "Settings", permissions: ["manageSettings", "managePlatformSettings", "manageBillingSettings", "manageWaivers"] }
];

export default function SettingsPage() {
  const { activeStaff, staffUsers } = useWorkstationState();
  const {
    settings,
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
    updateAdvanced,
    updateOperations,
    updateCalendar
  } = useSettingsState();

  const [activeSection, setActiveSection] = useState<SettingsSection>("facility");
  const [pendingSection, setPendingSection] = useState<SettingsSection | null>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [warning, setWarning] = useState("");

  const [facilityDraft, setFacilityDraft] = useState(settings.facilityProfile);
  const [membershipDraft, setMembershipDraft] = useState(settings.membershipAccess);
  const [waiverDraft, setWaiverDraft] = useState(settings.waiver);
  const [posDraft, setPosDraft] = useState(settings.posPayments);
  const [brandingDraft, setBrandingDraft] = useState(settings.branding);
  const [brandingFiles, setBrandingFiles] = useState<{ logo?: string; favicon?: string; darkMode?: string }>({});
  const [notificationDraft, setNotificationDraft] = useState(settings.notifications);
  const [advancedDraft, setAdvancedDraft] = useState(settings.advanced);
  const [operationsDraft, setOperationsDraft] = useState(settings.operations);
  const [calendarDraft, setCalendarDraft] = useState(settings.calendar);

  const [locationQuery, setLocationQuery] = useState("");
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [locationForm, setLocationForm] = useState({
    name: "",
    shortName: "",
    city: "",
    state: "",
    postalCode: "",
    addressLine1: "",
    phone: "",
    email: "",
    capacity: 0,
    timezoneOverride: "",
    checkInEnabled: true,
    posEnabled: true,
    programsEnabled: true,
    manager: "",
    allowedStaff: "",
    active: true
  });
  const [archiveTargetLocationId, setArchiveTargetLocationId] = useState<string | null>(null);

  const [roleQuery, setRoleQuery] = useState("");
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<StaffRoleDefinition | null>(null);
  const [roleForm, setRoleForm] = useState({
    name: "",
    description: "",
    color: "slate",
    active: true,
    permissions: [] as StaffPermission[]
  });
  const [archiveTargetRoleId, setArchiveTargetRoleId] = useState<string | null>(null);
  const [deleteTargetRoleId, setDeleteTargetRoleId] = useState<string | null>(null);
  const [savingSection, setSavingSection] = useState<SettingsSection | null>(null);

  const canManageSettings = activeStaff?.role === "owner" || activeStaff?.permissions.includes("manageSettings");
  const canManageRoles = activeStaff?.role === "owner";
  const locationFiltered = settings.locations.filter((entry) => entry.name.toLowerCase().includes(locationQuery.toLowerCase().trim()));
  const roleFiltered = settings.roleDefinitions.filter((entry) => entry.name.toLowerCase().includes(roleQuery.toLowerCase().trim()));
  const permissionSearch = roleQuery.trim().toLowerCase();

  const sectionDirtyMap = useMemo<Record<SettingsSection, boolean>>(
    () => ({
      facility: JSON.stringify(facilityDraft) !== JSON.stringify(settings.facilityProfile),
      locations: false,
      staff_roles: false,
      permissions: false,
      billing: false,
      membership_access: JSON.stringify(membershipDraft) !== JSON.stringify(settings.membershipAccess),
      waivers: JSON.stringify(waiverDraft) !== JSON.stringify(settings.waiver),
      pos_payments: JSON.stringify(posDraft) !== JSON.stringify(settings.posPayments),
      branding: JSON.stringify(brandingDraft) !== JSON.stringify(settings.branding),
      notifications: JSON.stringify(notificationDraft) !== JSON.stringify(settings.notifications),
      advanced:
        JSON.stringify(advancedDraft) !== JSON.stringify(settings.advanced) ||
        JSON.stringify(operationsDraft) !== JSON.stringify(settings.operations) ||
        JSON.stringify(calendarDraft) !== JSON.stringify(settings.calendar)
    }),
    [settings, facilityDraft, membershipDraft, waiverDraft, posDraft, brandingDraft, notificationDraft, advancedDraft, operationsDraft, calendarDraft]
  );

  const hasUnsavedChanges = Object.values(sectionDirtyMap).some(Boolean);

  useEffect(() => {
    if (hasUnsavedChanges) {
      return;
    }
    setFacilityDraft(settings.facilityProfile);
    setMembershipDraft(settings.membershipAccess);
    setWaiverDraft(settings.waiver);
    setPosDraft(settings.posPayments);
    setBrandingDraft(settings.branding);
    setBrandingFiles({});
    setNotificationDraft(settings.notifications);
    setAdvancedDraft(settings.advanced);
    setOperationsDraft(settings.operations);
    setCalendarDraft(settings.calendar);
  }, [settings, hasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const requestSectionChange = (next: SettingsSection) => {
    if (next === activeSection) return;
    if (sectionDirtyMap[activeSection]) {
      setPendingSection(next);
      setShowUnsavedModal(true);
      return;
    }
    setActiveSection(next);
  };

  const saveFacility = () => {
    setSavingSection("facility");
    updateFacilityProfile(facilityDraft);
    setFeedback("Facility settings saved.");
    setWarning("");
    setTimeout(() => setSavingSection(null), 250);
  };

  const saveSection = (section: SettingsSection, callback: () => void, successMessage: string) => {
    setSavingSection(section);
    callback();
    setFeedback(successMessage);
    setWarning("");
    setTimeout(() => setSavingSection(null), 250);
  };

  const updateBrandColor = (field: "primaryColor" | "secondaryColor", nextValue: string) => {
    setBrandingDraft((prev) => ({ ...prev, [field]: nextValue }));
  };

  const handleBrandFileUpload = async (field: "logoUrl" | "faviconUrl" | "darkModeLogoUrl", file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) return;
      setBrandingDraft((prev) => ({ ...prev, [field]: result }));
      setBrandingFiles((prev) => ({
        ...prev,
        ...(field === "logoUrl" ? { logo: file.name } : {}),
        ...(field === "faviconUrl" ? { favicon: file.name } : {}),
        ...(field === "darkModeLogoUrl" ? { darkMode: file.name } : {})
      }));
    };
    reader.readAsDataURL(file);
  };

  const clearBrandFile = (field: "logoUrl" | "faviconUrl" | "darkModeLogoUrl") => {
    setBrandingDraft((prev) => ({ ...prev, [field]: "" }));
    setBrandingFiles((prev) => ({
      ...prev,
      ...(field === "logoUrl" ? { logo: "" } : {}),
      ...(field === "faviconUrl" ? { favicon: "" } : {}),
      ...(field === "darkModeLogoUrl" ? { darkMode: "" } : {})
    }));
  };

  const openCreateLocation = () => {
    setEditingLocation(null);
    setLocationForm({
      name: "",
      shortName: "",
      city: "",
      state: "",
      postalCode: "",
      addressLine1: "",
      phone: "",
      email: "",
      capacity: 0,
      timezoneOverride: "",
      checkInEnabled: true,
      posEnabled: true,
      programsEnabled: true,
      manager: "",
      allowedStaff: "",
      active: true
    });
    setShowLocationModal(true);
  };

  const openEditLocation = (location: Location) => {
    setEditingLocation(location);
    setLocationForm({
      name: location.name,
      shortName: location.shortName ?? "",
      city: location.city,
      state: location.state,
      postalCode: location.postalCode ?? "",
      addressLine1: location.addressLine1 ?? "",
      phone: location.phone ?? "",
      email: "",
      capacity: location.capacity ?? 0,
      timezoneOverride: "",
      checkInEnabled: true,
      posEnabled: true,
      programsEnabled: true,
      manager: "",
      allowedStaff: "",
      active: location.active ?? true
    });
    setShowLocationModal(true);
  };

  const submitLocation = () => {
    if (editingLocation) {
      const result = updateLocation(editingLocation.id, {
        name: locationForm.name,
        shortName: locationForm.shortName || undefined,
        city: locationForm.city,
        state: locationForm.state.toUpperCase(),
        postalCode: locationForm.postalCode || undefined,
        addressLine1: locationForm.addressLine1 || undefined,
        phone: locationForm.phone || undefined,
        capacity: Number.isFinite(locationForm.capacity) ? locationForm.capacity : undefined,
        active: locationForm.active
      });
      if (!result.ok) {
        setWarning(result.message);
        setFeedback("");
        return;
      }
      setFeedback("Location updated.");
      setWarning("");
      setShowLocationModal(false);
      return;
    }
    const result = addLocation({
      name: locationForm.name,
      shortName: locationForm.shortName || undefined,
      city: locationForm.city,
      state: locationForm.state.toUpperCase(),
      postalCode: locationForm.postalCode || undefined,
      addressLine1: locationForm.addressLine1 || undefined,
      phone: locationForm.phone || undefined,
      capacity: Number.isFinite(locationForm.capacity) ? locationForm.capacity : undefined,
      active: locationForm.active,
      isDefault: false
    });
    if (!result.ok) {
      setWarning(result.message);
      setFeedback("");
      return;
    }
    setFeedback(result.message);
    setWarning("");
    setShowLocationModal(false);
  };

  const openCreateRole = () => {
    setEditingRole(null);
    setRoleForm({ name: "", description: "", color: "slate", active: true, permissions: [] });
    setShowRoleModal(true);
  };
  const openEditRole = (role: StaffRoleDefinition) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      description: role.description ?? "",
      color: "slate",
      active: role.active,
      permissions: [...role.permissions]
    });
    setShowRoleModal(true);
  };
  const submitRole = () => {
    if (editingRole) {
      const result = updateRole(editingRole.id, {
        name: roleForm.name.trim(),
        description: roleForm.description.trim(),
        color: roleForm.color,
        permissions: roleForm.permissions,
        active: roleForm.active
      });
      if (!result.ok) {
        setWarning(result.message);
        setFeedback("");
        return;
      }
      setFeedback("Role updated.");
      setWarning("");
      setShowRoleModal(false);
      return;
    }
    const result = createRole({
      name: roleForm.name,
      description: roleForm.description,
      color: roleForm.color,
      permissions: roleForm.permissions,
      active: roleForm.active
    });
    if (!result.ok) {
      setWarning(result.message);
      setFeedback("");
      return;
    }
    setFeedback(result.message);
    setWarning("");
    setShowRoleModal(false);
  };

  return (
    <PermissionGate permission="manageSettings">
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">Settings</h2>
            <p className="text-sm text-muted-foreground">Facility administration for operations, staff, access, and payments.</p>
            <p className="mt-1 text-xs text-muted-foreground">Cairn v{CAIRN_VERSION} · {CAIRN_RELEASE_STATUS} · Target {CAIRN_RELEASE_DATE}</p>
          </div>
          <div className="rounded-md bg-secondary px-3 py-2 text-sm text-muted-foreground">
            {hasUnsavedChanges ? "Unsaved changes" : "All changes saved"}
          </div>
        </div>

        {feedback ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{feedback}</p> : null}
        {warning ? <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{warning}</p> : null}

        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          <Card>
            <CardContent className="p-3">
              <nav className="space-y-1" aria-label="Settings sections">
                {settingsSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => requestSectionChange(section.id)}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      activeSection === section.id ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                    }`}
                  >
                    <span>{section.label}</span>
                    {sectionDirtyMap[section.id] ? <span className="text-xs">●</span> : null}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {activeSection === "facility" ? (
              <Card>
                <CardHeader>
                  <CardTitle>Facility Profile</CardTitle>
                  <CardDescription>Business identity, contact details, and operating defaults.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormGrid>
                    <FormField label="Facility/business name"><TextInput value={facilityDraft.facilityName} onChange={(e) => setFacilityDraft((p) => ({ ...p, facilityName: e.target.value }))} /></FormField>
                    <FormField label="Legal business name"><TextInput value={facilityDraft.legalBusinessName ?? ""} onChange={(e) => setFacilityDraft((p) => ({ ...p, legalBusinessName: e.target.value }))} /></FormField>
                    <FormField label="Primary email"><TextInput value={facilityDraft.email ?? ""} onChange={(e) => setFacilityDraft((p) => ({ ...p, email: e.target.value }))} /></FormField>
                    <FormField label="Phone number"><TextInput value={facilityDraft.phone ?? ""} onChange={(e) => setFacilityDraft((p) => ({ ...p, phone: e.target.value }))} /></FormField>
                    <FormField label="Website"><TextInput value={facilityDraft.website ?? ""} onChange={(e) => setFacilityDraft((p) => ({ ...p, website: e.target.value }))} /></FormField>
                    <FormField label="Tax ID (optional)"><TextInput value={facilityDraft.taxId ?? ""} onChange={(e) => setFacilityDraft((p) => ({ ...p, taxId: e.target.value }))} /></FormField>
                    <FormField label="Timezone">
                      <SelectInput value={facilityDraft.timezone} onChange={(e) => setFacilityDraft((p) => ({ ...p, timezone: e.target.value }))}>
                        {timezoneOptions.map((zone) => (
                          <option key={zone} value={zone}>{zone}</option>
                        ))}
                      </SelectInput>
                    </FormField>
                    <FormField label="Date format">
                      <SelectInput
                        value={facilityDraft.dateFormat ?? "MM/DD/YYYY"}
                        onChange={(e) => setFacilityDraft((p) => ({ ...p, dateFormat: e.target.value as (typeof dateFormatOptions)[number] }))}
                      >
                        {dateFormatOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </SelectInput>
                    </FormField>
                    <FormField label="Time format">
                      <SelectInput
                        value={facilityDraft.timeFormat ?? "12-hour"}
                        onChange={(e) => setFacilityDraft((p) => ({ ...p, timeFormat: e.target.value as (typeof timeFormatOptions)[number] }))}
                      >
                        {timeFormatOptions.map((option) => (
                          <option key={option} value={option}>
                            {option === "12-hour" ? "12-hour, example: 8:45 AM" : "24-hour, example: 20:45"}
                          </option>
                        ))}
                      </SelectInput>
                    </FormField>
                    <FormField label="Currency"><TextInput value={facilityDraft.currency} onChange={(e) => setFacilityDraft((p) => ({ ...p, currency: e.target.value }))} /></FormField>
                    <FormField label="Business type">
                      <SelectInput value={facilityDraft.businessType} onChange={(e) => setFacilityDraft((p) => ({ ...p, businessType: e.target.value }))}>
                        <option>Climbing Gym</option><option>Community Center</option><option>Bike Park</option><option>Adventure Facility</option><option>Camp</option><option>Fitness Center</option><option>Hybrid</option>
                      </SelectInput>
                    </FormField>
                    <FormField label="Address line 1"><TextInput value={facilityDraft.addressLine1 ?? ""} onChange={(e) => setFacilityDraft((p) => ({ ...p, addressLine1: e.target.value }))} /></FormField>
                    <FormField label="City"><TextInput value={facilityDraft.city ?? ""} onChange={(e) => setFacilityDraft((p) => ({ ...p, city: e.target.value }))} /></FormField>
                    <FormField label="State"><TextInput value={facilityDraft.state ?? ""} onChange={(e) => setFacilityDraft((p) => ({ ...p, state: e.target.value.toUpperCase().slice(0, 2) }))} /></FormField>
                    <FormField label="ZIP/postal code"><TextInput value={facilityDraft.postalCode ?? ""} onChange={(e) => setFacilityDraft((p) => ({ ...p, postalCode: e.target.value }))} /></FormField>
                    <FormField label="Emergency contact info"><TextInput value={facilityDraft.emergencyContact ?? ""} onChange={(e) => setFacilityDraft((p) => ({ ...p, emergencyContact: e.target.value }))} /></FormField>
                    <FormField label="Facility description" className="md:col-span-2"><TextareaInput value={facilityDraft.description ?? ""} onChange={(e) => setFacilityDraft((p) => ({ ...p, description: e.target.value }))} /></FormField>
                  </FormGrid>
                  <Card>
                    <CardHeader><CardTitle className="text-base">Preview</CardTitle></CardHeader>
                    <CardContent className="text-sm">
                      <p className="font-semibold">{facilityDraft.facilityName}</p>
                      <p className="text-muted-foreground">{facilityDraft.businessType} • {facilityDraft.city}, {facilityDraft.state}</p>
                      <p className="text-muted-foreground">{facilityDraft.phone} • {facilityDraft.email}</p>
                    </CardContent>
                  </Card>
                  <div className="flex justify-end">
                    <Button onClick={saveFacility} disabled={!sectionDirtyMap.facility || !canManageSettings || savingSection === "facility"}>{savingSection === "facility" ? "Saving..." : "Save Facility Settings"}</Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {activeSection === "locations" ? (
              <Card>
                <CardHeader>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <CardTitle>Locations</CardTitle>
                      <CardDescription>Manage active/archived facilities and operational controls.</CardDescription>
                    </div>
                    <Button onClick={openCreateLocation} disabled={!canManageSettings}>Add Location</Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <FormField label="Search locations">
                    <TextInput value={locationQuery} onChange={(e) => setLocationQuery(e.target.value)} placeholder="Search location name" />
                  </FormField>
                  <div className="space-y-2">
                    {locationFiltered.map((location) => (
                      <div key={location.id} className="rounded-lg border p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-medium">{location.name}</p>
                            <p className="text-sm text-muted-foreground">{location.shortName || "No code"} • {location.city}, {location.state}</p>
                          </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={location.active ? "success" : "muted"}>{location.active ? "Active" : "Archived"}</Badge>
                            {location.isDefault ? <Badge tone="muted">Default</Badge> : null}
                          </div>
                        </div>
                        <div className="mt-2" data-testid="location-detail-list">
                          <dl className="space-y-1 text-sm">
                            <div className="grid grid-cols-[110px_1fr] gap-2">
                              <dt className="text-muted-foreground">Capacity</dt>
                              <dd>{location.capacity ?? "Not set"}</dd>
                            </div>
                            <div className="grid grid-cols-[110px_1fr] gap-2">
                              <dt className="text-muted-foreground">Check-in</dt>
                              <dd>Enabled</dd>
                            </div>
                            <div className="grid grid-cols-[110px_1fr] gap-2">
                              <dt className="text-muted-foreground">POS</dt>
                              <dd>Enabled</dd>
                            </div>
                            <div className="grid grid-cols-[110px_1fr] gap-2">
                              <dt className="text-muted-foreground">Programs</dt>
                              <dd>Enabled</dd>
                            </div>
                            <div className="grid grid-cols-[110px_1fr] gap-2">
                              <dt className="text-muted-foreground">Address</dt>
                              <dd>{location.addressLine1 ?? "—"}</dd>
                            </div>
                            <div className="grid grid-cols-[110px_1fr] gap-2">
                              <dt className="text-muted-foreground">Phone</dt>
                              <dd>{location.phone ?? "—"}</dd>
                            </div>
                          </dl>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button variant="secondary" className="h-9" onClick={() => openEditLocation(location)} disabled={!canManageSettings}>Edit location</Button>
                          {!location.isDefault ? <Button variant="secondary" className="h-9" onClick={() => {
                            const result = setDefaultLocation(location.id);
                            setFeedback(result.message);
                            setWarning(result.ok ? "" : result.message);
                          }} disabled={!canManageSettings}>Set default</Button> : null}
                          {location.active ? <Button variant="destructiveSubtle" className="h-9" onClick={() => setArchiveTargetLocationId(location.id)} disabled={!canManageSettings}>Archive</Button> : null}
                        </div>
                      </div>
                    ))}
                    {locationFiltered.length === 0 ? <p className="text-sm text-muted-foreground">No locations match your search.</p> : null}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {activeSection === "staff_roles" ? (
              <Card>
                <CardHeader>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <CardTitle>Staff Roles</CardTitle>
                      <CardDescription>System roles are protected. Owners can create and manage custom roles.</CardDescription>
                    </div>
                    <Button onClick={openCreateRole} disabled={!canManageRoles}>Create Role</Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <FormField label="Search roles"><TextInput value={roleQuery} onChange={(e) => setRoleQuery(e.target.value)} placeholder="Search role name" /></FormField>
                  {roleFiltered.map((role) => (
                    <div key={role.id} className="rounded-lg border p-3">
                      {(() => {
                        const mappedRole = mapRoleNameToStaffRole(role.name);
                        const roleInUse = mappedRole ? staffUsers.some((staff) => staff.role === mappedRole) : false;
                        return (
                          <>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium">{role.name}</p>
                          <p className="text-sm text-muted-foreground">{role.description || "No description"}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${roleColorChipClass[role.color ?? "slate"]}`}>
                            {roleColorOptions.find((option) => option.value === role.color)?.label ?? "Slate"}
                          </span>
                          {role.isSystem ? <Badge tone="muted">System role</Badge> : null}
                          <Badge tone={role.active ? "success" : "muted"}>{role.active ? "Active" : "Archived"}</Badge>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {role.permissions.slice(0, 8).map((permission) => <Badge tone="muted" key={permission}>{PERMISSION_LABELS[permission]}</Badge>)}
                        {role.permissions.length > 8 ? <Badge tone="muted">+{role.permissions.length - 8} more</Badge> : null}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button variant="secondary" className="h-9" onClick={() => openEditRole(role)} disabled={!canManageRoles}>Edit role</Button>
                        <Button variant="secondary" className="h-9" onClick={() => {
                          const result = duplicateRole(role.id);
                          setFeedback(result.message);
                          setWarning(result.ok ? "" : result.message);
                        }} disabled={!canManageRoles}>Duplicate role</Button>
                        {!role.isSystem ? <Button variant="destructiveSubtle" className="h-9" onClick={() => setArchiveTargetRoleId(role.id)} disabled={!canManageRoles}>Archive role</Button> : null}
                        {!role.isSystem && !roleInUse ? <Button variant="destructiveSubtle" className="h-9" onClick={() => setDeleteTargetRoleId(role.id)} disabled={!canManageRoles}>Delete role</Button> : null}
                      </div>
                          </>
                        );
                      })()}
                    </div>
                  ))}
                  {roleFiltered.length === 0 ? <p className="text-sm text-muted-foreground">No roles match your search.</p> : null}
                </CardContent>
              </Card>
            ) : null}

            {activeSection === "permissions" ? (
              <Card>
                <CardHeader>
                  <CardTitle>Permissions</CardTitle>
                  <CardDescription>Reference matrix for what each permission allows in day-to-day operations.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField label="Search permissions">
                    <TextInput value={roleQuery} onChange={(e) => setRoleQuery(e.target.value)} placeholder="Search permission labels" />
                  </FormField>
                  <div className="space-y-3">
                    {permissionGroups.map((group) => {
                      const filtered = group.permissions.filter((permission) => {
                        if (!permissionSearch) return true;
                        const label = PERMISSION_LABELS[permission].toLowerCase();
                        const description = PERMISSION_DESCRIPTIONS[permission].toLowerCase();
                        return label.includes(permissionSearch) || description.includes(permissionSearch);
                      });
                      if (filtered.length === 0) return null;
                      return (
                        <Card key={group.label}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">{group.label}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {filtered.map((permission) => (
                              <div key={permission} className="rounded-md border p-3">
                                <p className="font-medium">{PERMISSION_LABELS[permission]}</p>
                                <p className="text-sm text-muted-foreground">{PERMISSION_DESCRIPTIONS[permission]}</p>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {activeSection === "billing" ? (
              <Card>
                <CardHeader>
                  <CardTitle>Organization Billing</CardTitle>
                  <CardDescription>Informational subscription details. Cairn does not restrict features, seats, customers, households, or transactions by plan.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
                    <p className="font-semibold">Complete platform access</p>
                    <p className="mt-1">Organizations pay based on facilities operated and support level. Every plan receives the full Cairn product.</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <BillingMetric label="Current plan" value={getPlanName(facilityDraft.subscriptionPlan ?? "single_facility")} />
                    <BillingMetric label="Billing frequency" value={(facilityDraft.billingFrequency ?? "monthly").replaceAll("_", " ")} />
                    <BillingMetric label="Support tier" value={getSupportTierName(facilityDraft.supportTier ?? "standard")} />
                    <BillingMetric label="Billing status" value={(facilityDraft.billingStatus ?? "trialing").replaceAll("_", " ")} />
                    <BillingMetric label="Trial status" value={(facilityDraft.trialStatus ?? "trial").replaceAll("_", " ")} />
                    <BillingMetric label="Renewal date" value={facilityDraft.renewalDate ?? "Not scheduled"} />
                    <BillingMetric label="Facilities used" value={String(settings.locations.filter((entry) => entry.active !== false).length)} />
                    <BillingMetric label="Facilities included" value={formatFacilitiesIncluded(facilityDraft.facilitiesIncluded ?? 1)} />
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <Button variant="outline" onClick={() => setFeedback("Plan upgrades are handled by Cairn for pilot customers.")}>Upgrade plan</Button>
                    <Button variant="outline" onClick={() => setFeedback("Billing frequency changes are informational during the pilot.")}>Change billing frequency</Button>
                    <Button variant="outline" onClick={() => setFeedback("Contact Cairn at support@stonecairn.app.")}>Contact Cairn</Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {activeSection === "membership_access" ? (
              <Card>
                <CardHeader><CardTitle>Membership & Access Defaults</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <FormGrid>
                    <FormField label="Default waiver expiration (days)"><TextInput type="number" value={membershipDraft.defaultWaiverExpirationDays} onChange={(e) => setMembershipDraft((p) => ({ ...p, defaultWaiverExpirationDays: Number(e.target.value) || 0 }))} /></FormField>
                    <FormField label="Guardian required under age"><TextInput type="number" value={membershipDraft.householdGuardianRequiredUnderAge} onChange={(e) => setMembershipDraft((p) => ({ ...p, householdGuardianRequiredUnderAge: Number(e.target.value) || 0 }))} /></FormField>
                    <FormField label="Simultaneous access limit"><TextInput type="number" value={membershipDraft.simultaneousAccessLimit} onChange={(e) => setMembershipDraft((p) => ({ ...p, simultaneousAccessLimit: Number(e.target.value) || 0 }))} /></FormField>
                    <FormField label="Check-in grace period (minutes)"><TextInput type="number" value={membershipDraft.checkInGracePeriodMinutes} onChange={(e) => setMembershipDraft((p) => ({ ...p, checkInGracePeriodMinutes: Number(e.target.value) || 0 }))} /></FormField>
                    <FormField label="Expiration warning days"><TextInput type="number" value={membershipDraft.expirationWarningDays} onChange={(e) => setMembershipDraft((p) => ({ ...p, expirationWarningDays: Number(e.target.value) || 0 }))} /></FormField>
                    <FormField label="Guest policy"><SelectInput value={membershipDraft.allowGuestCheckIn ? "allowed" : "blocked"} onChange={(e) => setMembershipDraft((p) => ({ ...p, allowGuestCheckIn: e.target.value === "allowed" }))}><option value="allowed">Guests allowed</option><option value="blocked">Guests blocked</option></SelectInput></FormField>
                    <FormField label="Expired waiver behavior"><SelectBehavior value={membershipDraft.expiredWaiverAction} onChange={(value) => setMembershipDraft((p) => ({ ...p, expiredWaiverAction: value }))} /></FormField>
                    <FormField label="Expired membership behavior"><SelectBehavior value={membershipDraft.expiredMembershipAction} onChange={(value) => setMembershipDraft((p) => ({ ...p, expiredMembershipAction: value }))} /></FormField>
                    <FormField label="Missing guardian behavior"><SelectBehavior value={membershipDraft.missingGuardianAction} onChange={(value) => setMembershipDraft((p) => ({ ...p, missingGuardianAction: value }))} /></FormField>
                    <FormField label="Unpaid account behavior"><SelectBehavior value={membershipDraft.unpaidAccountAction} onChange={(value) => setMembershipDraft((p) => ({ ...p, unpaidAccountAction: value }))} /></FormField>
                  </FormGrid>
                  <div className="flex justify-end"><Button onClick={() => saveSection("membership_access", () => updateMembershipAccess(membershipDraft), "Membership & access settings saved.")} disabled={!sectionDirtyMap.membership_access || savingSection === "membership_access"}>{savingSection === "membership_access" ? "Saving..." : "Save Membership & Access"}</Button></div>
                </CardContent>
              </Card>
            ) : null}

            {activeSection === "waivers" ? (
              <Card>
                <CardHeader><CardTitle>Waiver Settings</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <Card>
                    <CardHeader><CardTitle className="text-base">Waiver roadmap</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                      <p>Waiver builder and digital signing will be added in a future phase.</p>
                      <ul className="list-disc space-y-1 pl-5">
                        <li>Create and version waiver text</li>
                        <li>Digital and guardian signatures</li>
                        <li>Signed waiver history and PDF export</li>
                        <li>Waiver requirements by product and program</li>
                        <li>Expiration rules by waiver version</li>
                      </ul>
                      <p className="text-xs">Planned record fields: `waiverVersionId`, `customerId`, `signedByCustomerId`, `guardianId`, `signedAt`, `expiresAt`, `signatureData`, `pdfUrl`.</p>
                    </CardContent>
                  </Card>
                  <FormGrid>
                    <FormField label="Active waiver version"><TextInput value={waiverDraft.activeWaiverVersion} onChange={(e) => setWaiverDraft((p) => ({ ...p, activeWaiverVersion: e.target.value }))} /></FormField>
                    <FormField label="Effective date"><TextInput type="date" value={waiverDraft.effectiveDate} onChange={(e) => setWaiverDraft((p) => ({ ...p, effectiveDate: e.target.value }))} /></FormField>
                    <FormField label="Waiver expiration (days)"><TextInput type="number" value={waiverDraft.expirationDays} onChange={(e) => setWaiverDraft((p) => ({ ...p, expirationDays: Number(e.target.value) || 0 }))} /></FormField>
                    <BooleanField label="Require for memberships" value={waiverDraft.requireForMembership} onChange={(value) => setWaiverDraft((p) => ({ ...p, requireForMembership: value }))} />
                    <BooleanField label="Require for day passes" value={waiverDraft.requireForDayPass} onChange={(value) => setWaiverDraft((p) => ({ ...p, requireForDayPass: value }))} />
                    <BooleanField label="Require for punch passes" value={waiverDraft.requireForPunchPass} onChange={(value) => setWaiverDraft((p) => ({ ...p, requireForPunchPass: value }))} />
                    <BooleanField label="Require for programs" value={waiverDraft.requireForPrograms} onChange={(value) => setWaiverDraft((p) => ({ ...p, requireForPrograms: value }))} />
                    <BooleanField label="Allow digital signatures" value={waiverDraft.allowDigitalSignature} onChange={(value) => setWaiverDraft((p) => ({ ...p, allowDigitalSignature: value }))} />
                    <BooleanField label="Require guardian signatures for minors" value={waiverDraft.requireGuardianForMinors} onChange={(value) => setWaiverDraft((p) => ({ ...p, requireGuardianForMinors: value }))} />
                  </FormGrid>
                  <div className="flex justify-end"><Button onClick={() => saveSection("waivers", () => updateWaiverSettings(waiverDraft), "Waiver settings saved.")} disabled={!sectionDirtyMap.waivers || savingSection === "waivers"}>{savingSection === "waivers" ? "Saving..." : "Save Waiver Settings"}</Button></div>
                </CardContent>
              </Card>
            ) : null}

            {activeSection === "pos_payments" ? (
              <Card>
                <CardHeader><CardTitle>POS & Payments</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <Card>
                    <CardHeader><CardTitle className="text-base">Payment Processor</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                      <p>Status: <span className="font-medium text-foreground">Not connected</span></p>
                      <p>Stripe integration is planned for a future phase.</p>
                      <ul className="list-disc space-y-1 pl-5">
                        <li>Connect Stripe</li>
                        <li>Manage terminals</li>
                        <li>Webhook status</li>
                        <li>Test mode / Live mode</li>
                      </ul>
                      <p>Card payments require a payment processor connection.</p>
                    </CardContent>
                  </Card>
                  <FormGrid>
                    <FormField label="Sales tax %"><TextInput type="number" step="0.001" value={posDraft.salesTaxPercent} onChange={(e) => setPosDraft((p) => ({ ...p, salesTaxPercent: Number(e.target.value) || 0 }))} /></FormField>
                    <BooleanField label="Taxable products by default" value={posDraft.taxableProductsByDefault} onChange={(value) => setPosDraft((p) => ({ ...p, taxableProductsByDefault: value }))} />
                    <BooleanField label="Allow refunds" value={posDraft.allowRefunds} onChange={(value) => setPosDraft((p) => ({ ...p, allowRefunds: value }))} />
                    <BooleanField label="Allow comp rules" value={posDraft.allowComps} onChange={(value) => setPosDraft((p) => ({ ...p, allowComps: value }))} />
                    <BooleanField label="Allow discounts" value={posDraft.allowDiscounts} onChange={(value) => setPosDraft((p) => ({ ...p, allowDiscounts: value }))} />
                    <BooleanField label="Cash drawer enabled" value={posDraft.cashDrawerEnabled} onChange={(value) => setPosDraft((p) => ({ ...p, cashDrawerEnabled: value }))} />
                  </FormGrid>
                  <FormField label="Receipt footer"><TextareaInput value={posDraft.receiptFooter} onChange={(e) => setPosDraft((p) => ({ ...p, receiptFooter: e.target.value }))} /></FormField>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Default payment methods</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {[
                        ["cash", "Cash"],
                        ["card", "Card"],
                        ["account_credit", "Account credit"],
                        ["comp", "Comp"],
                        ["gift_card", "Gift card"]
                      ].map(([id, label]) => (
                        <CheckboxField
                          key={id}
                          label={label}
                          checked={posDraft.paymentMethods.includes(id as (typeof posDraft.paymentMethods)[number])}
                          onChange={(checked) =>
                            setPosDraft((prev) => ({
                              ...prev,
                              paymentMethods: checked
                                ? Array.from(new Set([...prev.paymentMethods, id as (typeof prev.paymentMethods)[number]]))
                                : prev.paymentMethods.filter((entry) => entry !== id)
                            }))
                          }
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end"><Button onClick={() => saveSection("pos_payments", () => updatePosPayments(posDraft), "POS & payment settings saved.")} disabled={!sectionDirtyMap.pos_payments || savingSection === "pos_payments"}>{savingSection === "pos_payments" ? "Saving..." : "Save POS & Payments"}</Button></div>
                </CardContent>
              </Card>
            ) : null}

            {activeSection === "branding" ? (
              <Card>
                <CardHeader><CardTitle>Branding</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <FormGrid>
                    <ColorPickerField label="Primary brand color" value={brandingDraft.primaryColor} onChange={(value) => updateBrandColor("primaryColor", value)} helperText="Custom brand color for primary actions and active states." />
                    <ColorPickerField label="Secondary brand color" value={brandingDraft.secondaryColor} onChange={(value) => updateBrandColor("secondaryColor", value)} helperText="Custom secondary color used in supporting brand elements." />
                    <FormField label="Facility nickname" className="md:col-span-2"><TextInput value={brandingDraft.facilityNickname} onChange={(e) => setBrandingDraft((p) => ({ ...p, facilityNickname: e.target.value }))} /></FormField>
                    <FileUploadField
                      label="Upload logo"
                      accept="image/*"
                      filename={brandingFiles.logo}
                      helperText="Upload the primary facility logo."
                      onFileSelect={(file) => void handleBrandFileUpload("logoUrl", file)}
                      onRemove={() => clearBrandFile("logoUrl")}
                    />
                    <FileUploadField
                      label="Upload favicon"
                      accept="image/*"
                      filename={brandingFiles.favicon}
                      helperText="Upload a square favicon image."
                      onFileSelect={(file) => void handleBrandFileUpload("faviconUrl", file)}
                      onRemove={() => clearBrandFile("faviconUrl")}
                    />
                    <FileUploadField
                      className="md:col-span-2"
                      label="Upload dark mode logo (optional)"
                      accept="image/*"
                      filename={brandingFiles.darkMode}
                      helperText="Optional dark theme variant."
                      onFileSelect={(file) => void handleBrandFileUpload("darkModeLogoUrl", file)}
                      onRemove={() => clearBrandFile("darkModeLogoUrl")}
                    />
                  </FormGrid>
                  <div className="grid gap-3 md:grid-cols-3">
                    <Card>
                      <CardHeader><CardTitle className="text-sm">Logo preview</CardTitle></CardHeader>
                      <CardContent>{brandingDraft.logoUrl ? <img src={brandingDraft.logoUrl} alt="Logo preview" className="h-10 w-auto object-contain" /> : <p className="text-sm text-muted-foreground">No logo selected</p>}</CardContent>
                    </Card>
                    <Card>
                      <CardHeader><CardTitle className="text-sm">Favicon preview</CardTitle></CardHeader>
                      <CardContent>{brandingDraft.faviconUrl ? <img src={brandingDraft.faviconUrl} alt="Favicon preview" className="h-8 w-8 rounded-sm object-contain" /> : <p className="text-sm text-muted-foreground">No favicon selected</p>}</CardContent>
                    </Card>
                    <Card>
                      <CardHeader><CardTitle className="text-sm">Dark mode logo preview</CardTitle></CardHeader>
                      <CardContent>{brandingDraft.darkModeLogoUrl ? <img src={brandingDraft.darkModeLogoUrl} alt="Dark mode logo preview" className="h-10 w-auto object-contain" /> : <p className="text-sm text-muted-foreground">No dark mode logo selected</p>}</CardContent>
                    </Card>
                  </div>
                  <Card>
                    <CardHeader><CardTitle className="text-base">Navigation Preview</CardTitle></CardHeader>
                    <CardContent className="rounded-lg border bg-card p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Facility Ops</p>
                      <p className="mt-1 text-lg font-semibold" style={{ color: brandingDraft.primaryColor }}>{settings.facilityProfile.facilityName}</p>
                      <p className="text-sm text-muted-foreground">Nickname: {brandingDraft.facilityNickname || "Not set"}</p>
                    </CardContent>
                  </Card>
                  <div className="flex justify-end"><Button onClick={() => saveSection("branding", () => updateBranding({ ...brandingDraft, primaryColor: normalizeHexColor(brandingDraft.primaryColor, settings.branding.primaryColor), secondaryColor: normalizeHexColor(brandingDraft.secondaryColor, settings.branding.secondaryColor) }), "Branding settings saved.")} disabled={!sectionDirtyMap.branding || savingSection === "branding"}>{savingSection === "branding" ? "Saving..." : "Save Branding"}</Button></div>
                </CardContent>
              </Card>
            ) : null}

            {activeSection === "notifications" ? (
              <Card>
                <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Customer notifications</p>
                    <FormGrid>
                      <BooleanField label="Waiver expiring" value={notificationDraft.waiverExpiring} onChange={(value) => setNotificationDraft((p) => ({ ...p, waiverExpiring: value }))} />
                      <BooleanField label="Membership expiring" value={notificationDraft.membershipExpiring} onChange={(value) => setNotificationDraft((p) => ({ ...p, membershipExpiring: value }))} />
                      <BooleanField label="Registration reminders" value={notificationDraft.registrationReminder} onChange={(value) => setNotificationDraft((p) => ({ ...p, registrationReminder: value }))} />
                      <CheckboxField label="Payment receipts (future)" checked={false} onChange={() => undefined} />
                    </FormGrid>
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Staff notifications</p>
                    <FormGrid>
                      <BooleanField label="Staff invited" value={notificationDraft.staffInvited} onChange={(value) => setNotificationDraft((p) => ({ ...p, staffInvited: value }))} />
                      <CheckboxField label="Schedule reminders (future)" checked={false} onChange={() => undefined} />
                      <CheckboxField label="Override alerts (future)" checked={false} onChange={() => undefined} />
                    </FormGrid>
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Admin notifications</p>
                    <FormGrid>
                      <BooleanField label="Unpaid account" value={notificationDraft.unpaidAccount} onChange={(value) => setNotificationDraft((p) => ({ ...p, unpaidAccount: value }))} />
                      <CheckboxField label="Failed payment (future)" checked={false} onChange={() => undefined} />
                      <CheckboxField label="Low attendance (future)" checked={false} onChange={() => undefined} />
                      <CheckboxField label="High capacity warning (future)" checked={false} onChange={() => undefined} />
                    </FormGrid>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Channels</p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <BooleanField label="Email (future)" value={notificationDraft.channels.email} onChange={(value) => setNotificationDraft((p) => ({ ...p, channels: { ...p.channels, email: value } }))} />
                      <BooleanField label="SMS (future)" value={notificationDraft.channels.sms} onChange={(value) => setNotificationDraft((p) => ({ ...p, channels: { ...p.channels, sms: value } }))} />
                      <BooleanField label="In-app" value={notificationDraft.channels.inApp} onChange={(value) => setNotificationDraft((p) => ({ ...p, channels: { ...p.channels, inApp: value } }))} />
                    </div>
                  </div>
                  <div className="flex justify-end"><Button onClick={() => saveSection("notifications", () => updateNotifications(notificationDraft), "Notification settings saved.")} disabled={!sectionDirtyMap.notifications || savingSection === "notifications"}>{savingSection === "notifications" ? "Saving..." : "Save Notifications"}</Button></div>
                </CardContent>
              </Card>
            ) : null}

            {activeSection === "advanced" ? (
              <Card>
                <CardHeader><CardTitle>System Controls</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <FormGrid>
                    <CheckboxField label="Enforce role permissions" helperText="When enabled, staff can only access actions allowed by their assigned role." checked={advancedDraft.strictRoleChecks} onChange={(value) => setAdvancedDraft((p) => ({ ...p, strictRoleChecks: value }))} />
                    <FormField label="Audit log retention (days)" helperText="How long staff activity and system events are retained."><TextInput type="number" value={advancedDraft.auditLogRetentionDays} onChange={(e) => setAdvancedDraft((p) => ({ ...p, auditLogRetentionDays: Number(e.target.value) || 0 }))} /></FormField>
                    <CheckboxField label="Require reason for manager overrides" helperText="Staff must enter a reason when bypassing access, waiver, or guardian restrictions." checked={advancedDraft.requireReasonForOverrides} onChange={(value) => setAdvancedDraft((p) => ({ ...p, requireReasonForOverrides: value }))} />
                    <CheckboxField label="Facility is open 24/7" checked={operationsDraft.open24x7} onChange={(value) => setOperationsDraft((p) => ({ ...p, open24x7: value }))} />
                    <FormField label="Default closeout time">
                      <TextInput type="time" value={operationsDraft.defaultCloseoutTime} disabled={operationsDraft.open24x7} onChange={(e) => setOperationsDraft((p) => ({ ...p, defaultCloseoutTime: e.target.value }))} />
                    </FormField>
                    <CheckboxField label="Auto check-out active visitors at closeout" checked={operationsDraft.autoCheckoutAtCloseout} onChange={(value) => setOperationsDraft((p) => ({ ...p, autoCheckoutAtCloseout: value }))} />
                    <FormField label="Default calendar view">
                      <SelectInput value={calendarDraft.defaultView} onChange={(e) => setCalendarDraft((p) => ({ ...p, defaultView: e.target.value as "day" | "week" | "month" | "agenda" }))}>
                        <option value="day">Day</option>
                        <option value="week">Week</option>
                        <option value="month">Month</option>
                        <option value="agenda">Agenda</option>
                      </SelectInput>
                    </FormField>
                  </FormGrid>
                  <div className="flex justify-end"><Button onClick={() => saveSection("advanced", () => {
                    updateAdvanced(advancedDraft);
                    updateOperations(operationsDraft);
                    updateCalendar(calendarDraft);
                  }, "System controls saved.")} disabled={!sectionDirtyMap.advanced || savingSection === "advanced"}>{savingSection === "advanced" ? "Saving..." : "Save System Controls"}</Button></div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>

        <ModalShell
          open={showUnsavedModal}
          ariaLabel="Unsaved changes warning"
          title="You have unsaved changes"
          description="Save or discard your edits before switching sections."
          onClose={() => {
            setShowUnsavedModal(false);
            setPendingSection(null);
          }}
          maxWidthClassName="max-w-md"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setShowUnsavedModal(false); setPendingSection(null); }}>Stay here</Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (pendingSection) setActiveSection(pendingSection);
                  setShowUnsavedModal(false);
                  setPendingSection(null);
                }}
              >
                Discard changes
              </Button>
            </div>
          }
        >
          <p className="text-sm text-muted-foreground">This section has edits that are not saved.</p>
        </ModalShell>


        <ModalShell
          open={showLocationModal}
          ariaLabel={editingLocation ? "Edit Location" : "Add Location"}
          title={editingLocation ? "Edit Location" : "Add Location"}
          description="Location identity, operations, and staffing."
          onClose={() => setShowLocationModal(false)}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowLocationModal(false)}>Cancel</Button>
              <Button onClick={submitLocation}>{editingLocation ? "Save Location" : "Add Location"}</Button>
            </div>
          }
        >
          <FormGrid>
            <FormField label="Location name"><TextInput value={locationForm.name} onChange={(e) => setLocationForm((p) => ({ ...p, name: e.target.value }))} /></FormField>
            <FormField label="Internal short code"><TextInput value={locationForm.shortName} onChange={(e) => setLocationForm((p) => ({ ...p, shortName: e.target.value }))} /></FormField>
            <FormField label="Address line 1"><TextInput value={locationForm.addressLine1} onChange={(e) => setLocationForm((p) => ({ ...p, addressLine1: e.target.value }))} /></FormField>
            <FormField label="City"><TextInput value={locationForm.city} onChange={(e) => setLocationForm((p) => ({ ...p, city: e.target.value }))} /></FormField>
            <FormField label="State"><TextInput value={locationForm.state} onChange={(e) => setLocationForm((p) => ({ ...p, state: e.target.value.toUpperCase().slice(0, 2) }))} /></FormField>
            <FormField label="ZIP/postal code"><TextInput value={locationForm.postalCode} onChange={(e) => setLocationForm((p) => ({ ...p, postalCode: e.target.value }))} /></FormField>
            <FormField label="Phone"><TextInput value={locationForm.phone} onChange={(e) => setLocationForm((p) => ({ ...p, phone: e.target.value }))} /></FormField>
            <FormField label="Email"><TextInput value={locationForm.email} onChange={(e) => setLocationForm((p) => ({ ...p, email: e.target.value }))} /></FormField>
            <FormField label="Capacity"><TextInput type="number" value={locationForm.capacity} onChange={(e) => setLocationForm((p) => ({ ...p, capacity: Number(e.target.value) || 0 }))} /></FormField>
            <FormField label="Timezone override">
              <SelectInput value={locationForm.timezoneOverride} onChange={(e) => setLocationForm((p) => ({ ...p, timezoneOverride: e.target.value }))}>
                <option value="">Use facility timezone</option>
                {timezoneOptions.map((zone) => (
                  <option key={zone} value={zone}>{zone}</option>
                ))}
              </SelectInput>
            </FormField>
            <FormField label="Manager"><TextInput value={locationForm.manager} onChange={(e) => setLocationForm((p) => ({ ...p, manager: e.target.value }))} /></FormField>
            <FormField label="Staff with access" helperText="Staff who can work from or be assigned to this location.">
              <TextInput value={locationForm.allowedStaff} onChange={(e) => setLocationForm((p) => ({ ...p, allowedStaff: e.target.value }))} />
            </FormField>
            <BooleanField label="Active location" value={locationForm.active} onChange={(value) => setLocationForm((p) => ({ ...p, active: value }))} />
            <BooleanField label="Check-in enabled" value={locationForm.checkInEnabled} onChange={(value) => setLocationForm((p) => ({ ...p, checkInEnabled: value }))} />
            <BooleanField label="POS enabled" value={locationForm.posEnabled} onChange={(value) => setLocationForm((p) => ({ ...p, posEnabled: value }))} />
            <BooleanField label="Programs enabled" value={locationForm.programsEnabled} onChange={(value) => setLocationForm((p) => ({ ...p, programsEnabled: value }))} />
          </FormGrid>
        </ModalShell>

        <ModalShell
          open={archiveTargetLocationId !== null}
          ariaLabel="Archive location confirmation"
          title="Archive location?"
          description="Archived locations remain in reporting and historical records."
          onClose={() => setArchiveTargetLocationId(null)}
          maxWidthClassName="max-w-md"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setArchiveTargetLocationId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => {
                if (!archiveTargetLocationId) return;
                const result = archiveLocation(archiveTargetLocationId);
                setFeedback(result.ok ? result.message : "");
                setWarning(result.ok ? "" : result.message);
                setArchiveTargetLocationId(null);
              }}>Archive Location</Button>
            </div>
          }
        >
          <p className="text-sm text-muted-foreground">This location will be hidden from new operations but retained for reporting.</p>
        </ModalShell>

        <ModalShell
          open={showRoleModal}
          ariaLabel={editingRole ? "Edit Role" : "Create Role"}
          title={editingRole ? "Edit Role" : "Create Role"}
          description="Role permissions are applied to workstation staff access."
          onClose={() => setShowRoleModal(false)}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowRoleModal(false)}>Cancel</Button>
              <Button onClick={submitRole}>{editingRole ? "Save Role" : "Create Role"}</Button>
            </div>
          }
        >
          <FormGrid>
            <FormField label="Role name"><TextInput value={roleForm.name} onChange={(e) => setRoleForm((p) => ({ ...p, name: e.target.value }))} /></FormField>
            <FormField label="Color">
              <div className="flex items-center gap-2">
                <SelectInput value={roleForm.color} onChange={(e) => setRoleForm((p) => ({ ...p, color: e.target.value }))}>
                  {roleColorOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </SelectInput>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${roleColorChipClass[roleForm.color]}`}>
                  {roleColorOptions.find((option) => option.value === roleForm.color)?.label ?? "Slate"}
                </span>
              </div>
            </FormField>
            <FormField label="Description" className="md:col-span-2"><TextareaInput value={roleForm.description} onChange={(e) => setRoleForm((p) => ({ ...p, description: e.target.value }))} /></FormField>
            <BooleanField label="Active role" value={roleForm.active} onChange={(value) => setRoleForm((p) => ({ ...p, active: value }))} />
          </FormGrid>
          <div className="mt-3 space-y-2">
            <p className="text-sm font-medium">Permissions</p>
            {permissionGroups.map((group) => (
              <div key={group.label} className="rounded-md border p-2">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.permissions.map((permission) => (
                    <CheckboxField
                      key={permission}
                      label={PERMISSION_LABELS[permission]}
                      helperText={PERMISSION_DESCRIPTIONS[permission]}
                      checked={roleForm.permissions.includes(permission)}
                      onChange={(checked) =>
                        setRoleForm((prev) => ({
                          ...prev,
                          permissions: checked
                            ? Array.from(new Set([...prev.permissions, permission]))
                            : prev.permissions.filter((entry) => entry !== permission)
                        }))
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ModalShell>

        <ModalShell
          open={archiveTargetRoleId !== null}
          ariaLabel="Archive role confirmation"
          title="Archive role?"
          description="Archived roles remain in historical logs but cannot be newly assigned."
          onClose={() => setArchiveTargetRoleId(null)}
          maxWidthClassName="max-w-md"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setArchiveTargetRoleId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => {
                if (!archiveTargetRoleId) return;
                const result = archiveRole(archiveTargetRoleId, staffUsers);
                setFeedback(result.ok ? result.message : "");
                setWarning(result.ok ? "" : result.message);
                setArchiveTargetRoleId(null);
              }}>Archive Role</Button>
            </div>
          }
        >
          <p className="text-sm text-muted-foreground">System roles cannot be archived, and roles currently in use stay protected.</p>
        </ModalShell>

        <ModalShell
          open={deleteTargetRoleId !== null}
          ariaLabel="Delete role confirmation"
          title="Delete role?"
          description="This permanently removes the role. Staff cannot be assigned to it afterward."
          onClose={() => setDeleteTargetRoleId(null)}
          maxWidthClassName="max-w-md"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteTargetRoleId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => {
                if (!deleteTargetRoleId) return;
                const result = deleteRole(deleteTargetRoleId, staffUsers);
                setFeedback(result.ok ? result.message : "");
                setWarning(result.ok ? "" : result.message);
                setDeleteTargetRoleId(null);
              }}>Delete Role</Button>
            </div>
          }
        >
          <p className="text-sm text-muted-foreground">Use archive for roles that should remain available in historical records.</p>
        </ModalShell>
      </section>
    </PermissionGate>
  );
}

function SelectBehavior({ value, onChange }: { value: "warn" | "block" | "manager_override"; onChange: (value: "warn" | "block" | "manager_override") => void }) {
  return (
    <SelectInput value={value} onChange={(event) => onChange(event.target.value as "warn" | "block" | "manager_override")}>
      <option value="warn">Warn</option>
      <option value="block">Block</option>
      <option value="manager_override">Manager override</option>
    </SelectInput>
  );
}

function BooleanField({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <CheckboxField label={label} checked={value} onChange={onChange} />;
}

function BillingMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold capitalize">{value}</p>
    </div>
  );
}
