"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { staffUsers as seedStaffUsers } from "@/lib/mocks/staff";
import { data } from "@/lib/data";
import { buildScopedMockKey, loadMockState, saveMockState } from "@/lib/mock-storage";
import { staffHasAnyPermission, staffHasPermission } from "@/lib/staff/permissions";
import type { AuditLogEntry, StaffPermission, StaffUser } from "@/types/domain";
import { resolveTenant } from "@/lib/tenant/resolve";
import { getCurrentOrgSlugClient } from "@/lib/tenant/client";
import { parseOrgSlugFromPathname } from "@/lib/tenant/path";

function mergeSeedStaffUsers(stored: StaffUser[], seededStaffUsers: StaffUser[]) {
  const byId = new Map(stored.map((staff) => [staff.id, staff]));
  const merged: StaffUser[] = [...stored];
  for (const seeded of seededStaffUsers) {
    if (!byId.has(seeded.id)) merged.push(seeded);
  }
  return merged;
}

interface WorkstationStateContextValue {
  staffUsers: StaffUser[];
  activeStaff: StaffUser | null;
  auditLog: AuditLogEntry[];
  pinModalOpen: boolean;
  pinError: string;
  pinTitle: string;
  requestStaffSwitch: (title?: string) => void;
  closeStaffSwitch: () => void;
  switchStaffByPin: (pin: string) => { ok: boolean; message: string };
  hasPermission: (permission: StaffPermission) => boolean;
  hasAnyPermission: (permissions: StaffPermission[]) => boolean;
  hasLocationAccess: (locationId: string) => boolean;
  assertPermission: (permission: StaffPermission) => { ok: true } | { ok: false; message: string };
  assertLocationAccess: (locationId: string) => { ok: true } | { ok: false; message: string };
  getStaffName: (staffId?: string | null) => string;
  logAuditEvent: (entry: Omit<AuditLogEntry, "id" | "createdAt" | "organizationId" | "locationId">) => void;
  addInstructor: (input: { firstName: string; lastName: string; bio?: string; activeInstructor?: boolean }) => { ok: boolean; message: string };
  updateInstructor: (input: { id: string; firstName: string; lastName: string; bio?: string; activeInstructor?: boolean }) => { ok: boolean; message: string };
  toggleInstructorActive: (id: string) => { ok: boolean; message: string };
  addStaffMember: (input: {
    firstName: string;
    lastName: string;
    role: StaffUser["role"];
    email: string;
    phone?: string;
    pronouns?: string;
    locationIds: string[];
  }) => { ok: boolean; message: string; staffId?: string };
  updateStaffMember: (input: {
    id: string;
    firstName: string;
    lastName: string;
    role: StaffUser["role"];
    email: string;
    phone?: string;
    pronouns?: string;
    locationIds: string[];
    status?: StaffUser["status"];
    startDate?: string;
    notes?: string;
  }) => { ok: boolean; message: string };
  suspendStaffMember: (id: string) => { ok: boolean; message: string };
  activateStaffMember: (id: string) => { ok: boolean; message: string };
  setStaffPermissions: (id: string, permissions: StaffPermission[]) => { ok: boolean; message: string };
  resetPasswordPlaceholder: (id: string) => { ok: boolean; message: string };
  resetStaffPin: (id: string) => { ok: boolean; message: string; pin?: string };
}

const WorkstationStateContext = createContext<WorkstationStateContextValue | null>(null);

export function WorkstationStateProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const fallbackSlug = parseOrgSlugFromPathname(pathname) ?? "summit";
  const [orgSlug, setOrgSlug] = useState(fallbackSlug);
  useEffect(() => {
    const cookieSlug = getCurrentOrgSlugClient(fallbackSlug);
    if (cookieSlug !== orgSlug) setOrgSlug(cookieSlug);
  }, [fallbackSlug, orgSlug]);
  const tenant = useMemo(() => resolveTenant(orgSlug), [orgSlug]);
  const activeOrgId = tenant?.organizationId ?? "org_summit";
  const activeLocationId = tenant?.currentLocationId ?? data.locations[0]?.id ?? "loc_001";
  const ACTIVE_STAFF_STORAGE_KEY = useMemo(
    () => buildScopedMockKey(activeOrgId, activeLocationId, "activeStaff"),
    [activeOrgId, activeLocationId]
  );
  const STAFF_USERS_STORAGE_KEY = useMemo(
    () => buildScopedMockKey(activeOrgId, activeLocationId, "staffUsers"),
    [activeOrgId, activeLocationId]
  );
  const AUDIT_LOG_STORAGE_KEY = useMemo(
    () => buildScopedMockKey(activeOrgId, activeLocationId, "auditLog"),
    [activeOrgId, activeLocationId]
  );
  const orgSeedStaffUsers = useMemo(
    () => seedStaffUsers.filter((entry) => entry.organizationId === activeOrgId),
    [activeOrgId]
  );

  const [staffUsers, setStaffUsers] = useState<StaffUser[]>(orgSeedStaffUsers);
  const [activeStaffId, setActiveStaffId] = useState<string | null>(null);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinError, setPinError] = useState("");
  const [pinTitle, setPinTitle] = useState("Switch Staff");

  const activeStaff = useMemo(
    () => staffUsers.find((staff) => staff.id === activeStaffId) ?? null,
    [staffUsers, activeStaffId]
  );

  useEffect(() => {
    const storedStaffUsers = mergeSeedStaffUsers(loadMockState(STAFF_USERS_STORAGE_KEY, orgSeedStaffUsers) as StaffUser[], orgSeedStaffUsers);
    const savedActiveStaffId = loadMockState<string | null>(ACTIVE_STAFF_STORAGE_KEY, null);
    const storedAuditLog = loadMockState<AuditLogEntry[]>(AUDIT_LOG_STORAGE_KEY, []);

    setStaffUsers(storedStaffUsers);
    setActiveStaffId(
      savedActiveStaffId && storedStaffUsers.some((staff) => staff.id === savedActiveStaffId) ? savedActiveStaffId : null
    );
    setAuditLog(storedAuditLog);
    setHydrated(true);
  }, [AUDIT_LOG_STORAGE_KEY, ACTIVE_STAFF_STORAGE_KEY, STAFF_USERS_STORAGE_KEY, activeOrgId]);

  useEffect(() => {
    if (!hydrated) return;
    saveMockState(ACTIVE_STAFF_STORAGE_KEY, activeStaffId);
  }, [activeStaffId, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveMockState(STAFF_USERS_STORAGE_KEY, staffUsers);
  }, [staffUsers, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    saveMockState(AUDIT_LOG_STORAGE_KEY, auditLog);
  }, [auditLog, hydrated]);

  const requestStaffSwitch = (title = "Switch Staff") => {
    setPinTitle(title);
    setPinError("");
    setPinModalOpen(true);
  };

  const closeStaffSwitch = () => {
    setPinModalOpen(false);
    setPinError("");
  };

  const switchStaffByPin = (pin: string) => {
    const normalized = pin.trim();
    const staff = staffUsers.find((entry) => entry.pin === normalized);
    if (!staff) {
      const message = "Invalid PIN. Try again.";
      setPinError(message);
      return { ok: false, message };
    }

    setActiveStaffId(staff.id);
    setPinError("");
    setPinModalOpen(false);
    return { ok: true, message: `Active staff set to ${staff.firstName} ${staff.lastName}.` };
  };

  const hasPermission = (permission: StaffPermission) => {
    return staffHasPermission(activeStaff, permission);
  };

  const hasAnyPermission = (permissions: StaffPermission[]) => {
    return staffHasAnyPermission(activeStaff, permissions);
  };

  const hasLocationAccess = (locationId: string) => {
    if (!activeStaff) return false;
    return activeStaff.locationIds.includes(locationId);
  };

  const assertPermission = (permission: StaffPermission) => {
    if (!activeStaff) {
      return { ok: false as const, message: "Select staff PIN to continue." };
    }

    if (!staffHasPermission(activeStaff, permission)) {
      return { ok: false as const, message: "You do not have permission to perform this action." };
    }

    if (!activeStaff.locationIds.includes(activeLocationId)) {
      return { ok: false as const, message: "You do not have access to this location." };
    }

    return { ok: true as const };
  };

  const assertLocationAccess = (locationId: string) => {
    if (!activeStaff) {
      return { ok: false as const, message: "Select staff PIN to continue." };
    }
    if (!activeStaff.locationIds.includes(locationId)) {
      return { ok: false as const, message: "You do not have access to this location." };
    }
    return { ok: true as const };
  };

  const getStaffName = (staffId?: string | null) => {
    if (!staffId) return "Unknown";
    const staff = staffUsers.find((entry) => entry.id === staffId);
    return staff ? `${staff.firstName} ${staff.lastName}` : "Unknown";
  };

  const logAuditEvent = (entry: Omit<AuditLogEntry, "id" | "createdAt" | "organizationId" | "locationId">) => {
    const nextEntry: AuditLogEntry = {
      id: `audit_${Math.random().toString(36).slice(2, 9)}`,
      organizationId: activeOrgId,
      locationId: activeLocationId,
      createdAt: new Date().toISOString(),
      ...entry
    };
    setAuditLog((prev) => [nextEntry, ...prev].slice(0, 500));
  };

  const addInstructor = (input: { firstName: string; lastName: string; bio?: string; activeInstructor?: boolean }) => {
    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    if (!firstName || !lastName) return { ok: false, message: "First and last name are required." };
    const id = `staff_${Math.random().toString(36).slice(2, 9)}`;
    const instructor: StaffUser = {
      id,
      organizationId: activeOrgId,
      locationIds: [activeLocationId],
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      role: "instructor",
      initials: `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase(),
      pin: `${Math.floor(1000 + Math.random() * 9000)}`,
      active: true,
      canTeach: true,
      activeInstructor: input.activeInstructor !== false,
      instructorBio: input.bio?.trim() || undefined,
      permissions: ["editPrograms"]
    };
    setStaffUsers((prev) => [instructor, ...prev]);
    return { ok: true, message: `Instructor added: ${firstName} ${lastName}.` };
  };

  const updateInstructor = (input: { id: string; firstName: string; lastName: string; bio?: string; activeInstructor?: boolean }) => {
    const existing = staffUsers.find((entry) => entry.id === input.id);
    if (!existing) return { ok: false, message: "Instructor not found." };
    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    if (!firstName || !lastName) return { ok: false, message: "First and last name are required." };
    setStaffUsers((prev) =>
      prev.map((entry) =>
        entry.id === input.id
          ? {
              ...entry,
              firstName,
              lastName,
              initials: `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase(),
              instructorBio: input.bio?.trim() || undefined,
              activeInstructor: input.activeInstructor ?? entry.activeInstructor
            }
          : entry
      )
    );
    return { ok: true, message: "Instructor updated." };
  };

  const toggleInstructorActive = (id: string) => {
    const existing = staffUsers.find((entry) => entry.id === id);
    if (!existing) return { ok: false, message: "Instructor not found." };
    setStaffUsers((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, activeInstructor: !(entry.activeInstructor ?? false) } : entry))
    );
    return { ok: true, message: `${existing.firstName} ${existing.lastName} ${existing.activeInstructor ? "deactivated" : "activated"}.` };
  };

  const addStaffMember = (input: {
    firstName: string;
    lastName: string;
    role: StaffUser["role"];
    email: string;
    phone?: string;
    pronouns?: string;
    locationIds: string[];
  }) => {
    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    const email = input.email.trim();
    if (!firstName || !lastName || !email) return { ok: false, message: "Name and email are required." };
    if (input.locationIds.length === 0) return { ok: false, message: "Assign at least one location." };
    const exists = staffUsers.some((entry) => entry.email.toLowerCase() === email.toLowerCase());
    if (exists) return { ok: false, message: "A staff member with that email already exists." };

    const id = `staff_${Math.random().toString(36).slice(2, 9)}`;
    const pin = `${Math.floor(1000 + Math.random() * 9000)}`;
    const staff: StaffUser = {
      id,
      organizationId: activeOrgId,
      locationIds: input.locationIds,
      firstName,
      lastName,
      email,
      phone: input.phone?.trim() || undefined,
      pronouns: input.pronouns?.trim() || undefined,
      role: input.role,
      initials: `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase(),
      pin,
      active: true,
      status: "active",
      startDate: new Date().toISOString().slice(0, 10),
      lastActiveAt: undefined,
      permissions: []
    };
    setStaffUsers((prev) => [staff, ...prev]);
    return { ok: true, message: `Staff added: ${firstName} ${lastName}. Temporary PIN: ${pin}`, staffId: id };
  };

  const updateStaffMember = (input: {
    id: string;
    firstName: string;
    lastName: string;
    role: StaffUser["role"];
    email: string;
    phone?: string;
    pronouns?: string;
    locationIds: string[];
    status?: StaffUser["status"];
    startDate?: string;
    notes?: string;
  }) => {
    const existing = staffUsers.find((entry) => entry.id === input.id);
    if (!existing) return { ok: false, message: "Staff member not found." };
    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    const email = input.email.trim();
    if (!firstName || !lastName || !email) return { ok: false, message: "Name and email are required." };
    if (input.locationIds.length === 0) return { ok: false, message: "Assign at least one location." };

    setStaffUsers((prev) =>
      prev.map((entry) =>
        entry.id === input.id
          ? {
              ...entry,
              firstName,
              lastName,
              role: input.role,
              email,
              phone: input.phone?.trim() || undefined,
              pronouns: input.pronouns?.trim() || undefined,
              locationIds: input.locationIds,
              status: input.status ?? entry.status,
              startDate: input.startDate ?? entry.startDate,
              notes: input.notes?.trim() || undefined,
              initials: `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase()
            }
          : entry
      )
    );
    return { ok: true, message: "Staff profile updated." };
  };

  const suspendStaffMember = (id: string) => {
    const existing = staffUsers.find((entry) => entry.id === id);
    if (!existing) return { ok: false, message: "Staff member not found." };
    if (existing.role === "owner") return { ok: false, message: "Owners cannot be suspended from this screen." };
    setStaffUsers((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, active: false, status: "inactive" } : entry))
    );
    if (activeStaffId === id) setActiveStaffId(null);
    return { ok: true, message: `${existing.firstName} ${existing.lastName} suspended.` };
  };

  const activateStaffMember = (id: string) => {
    const existing = staffUsers.find((entry) => entry.id === id);
    if (!existing) return { ok: false, message: "Staff member not found." };
    setStaffUsers((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, active: true, status: "active" } : entry))
    );
    return { ok: true, message: `${existing.firstName} ${existing.lastName} activated.` };
  };

  const setStaffPermissions = (id: string, permissions: StaffPermission[]) => {
    const existing = staffUsers.find((entry) => entry.id === id);
    if (!existing) return { ok: false, message: "Staff member not found." };
    setStaffUsers((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, permissions: Array.from(new Set(permissions)) } : entry))
    );
    return { ok: true, message: "Staff permissions updated." };
  };

  const resetPasswordPlaceholder = (id: string) => {
    const existing = staffUsers.find((entry) => entry.id === id);
    if (!existing) return { ok: false, message: "Staff member not found." };
    return { ok: true, message: `Password reset flow placeholder for ${existing.firstName} ${existing.lastName}.` };
  };

  const resetStaffPin = (id: string) => {
    const existing = staffUsers.find((entry) => entry.id === id);
    if (!existing) return { ok: false, message: "Staff member not found." };
    const pin = `${Math.floor(1000 + Math.random() * 9000)}`;
    setStaffUsers((prev) => prev.map((entry) => (entry.id === id ? { ...entry, pin } : entry)));
    return { ok: true, message: `Staff PIN reset for ${existing.firstName} ${existing.lastName}.`, pin };
  };

  const value = useMemo<WorkstationStateContextValue>(
    () => ({
      staffUsers,
      activeStaff,
      auditLog,
      pinModalOpen,
      pinError,
      pinTitle,
      requestStaffSwitch,
      closeStaffSwitch,
      switchStaffByPin,
      hasPermission,
      hasAnyPermission,
      hasLocationAccess,
      assertPermission,
      assertLocationAccess,
      getStaffName,
      logAuditEvent,
      addInstructor,
      updateInstructor,
      toggleInstructorActive,
      addStaffMember,
      updateStaffMember,
      suspendStaffMember,
      activateStaffMember,
      setStaffPermissions,
      resetPasswordPlaceholder,
      resetStaffPin
    }),
    [staffUsers, activeStaff, auditLog, pinModalOpen, pinError, pinTitle, activeStaffId]
  );

  return <WorkstationStateContext.Provider value={value}>{children}</WorkstationStateContext.Provider>;
}

export function useWorkstationState() {
  const ctx = useContext(WorkstationStateContext);
  if (!ctx) throw new Error("useWorkstationState must be used within WorkstationStateProvider");
  return ctx;
}
