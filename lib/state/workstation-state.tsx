"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { staffUsers as seedStaffUsers } from "@/lib/mocks/staff";
import { buildScopedMockKey, loadMockState, saveMockState } from "@/lib/mock-storage";
import type { StaffPermission, StaffUser } from "@/types/domain";

const ACTIVE_STAFF_STORAGE_KEY = buildScopedMockKey("org_summit", "loc_001", "activeStaff");
const STAFF_USERS_STORAGE_KEY = buildScopedMockKey("org_summit", "loc_001", "staffUsers");

interface WorkstationStateContextValue {
  staffUsers: StaffUser[];
  activeStaff: StaffUser | null;
  pinModalOpen: boolean;
  pinError: string;
  pinTitle: string;
  requestStaffSwitch: (title?: string) => void;
  closeStaffSwitch: () => void;
  switchStaffByPin: (pin: string) => { ok: boolean; message: string };
  hasPermission: (permission: StaffPermission) => boolean;
  assertPermission: (permission: StaffPermission) => { ok: true } | { ok: false; message: string };
  getStaffName: (staffId?: string | null) => string;
  addInstructor: (input: { firstName: string; lastName: string; bio?: string; activeInstructor?: boolean }) => { ok: boolean; message: string };
  updateInstructor: (input: { id: string; firstName: string; lastName: string; bio?: string; activeInstructor?: boolean }) => { ok: boolean; message: string };
  toggleInstructorActive: (id: string) => { ok: boolean; message: string };
}

const WorkstationStateContext = createContext<WorkstationStateContextValue | null>(null);

export function WorkstationStateProvider({ children }: { children: React.ReactNode }) {
  const initialRef = useRef<{ staffUsers: StaffUser[]; activeStaffId: string | null } | null>(null);
  if (!initialRef.current) {
    const staffUsers = (loadMockState(STAFF_USERS_STORAGE_KEY, seedStaffUsers) as StaffUser[]).filter((staff) => staff.active);
    const savedActiveStaffId = loadMockState<string | null>(ACTIVE_STAFF_STORAGE_KEY, null);
    initialRef.current = {
      staffUsers,
      activeStaffId: savedActiveStaffId && staffUsers.some((staff) => staff.id === savedActiveStaffId) ? savedActiveStaffId : null
    };
  }

  const [staffUsers, setStaffUsers] = useState<StaffUser[]>(initialRef.current.staffUsers);
  const [activeStaffId, setActiveStaffId] = useState<string | null>(
    initialRef.current.activeStaffId
  );
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinError, setPinError] = useState("");
  const [pinTitle, setPinTitle] = useState("Switch Staff");

  const activeStaff = useMemo(
    () => staffUsers.find((staff) => staff.id === activeStaffId) ?? null,
    [staffUsers, activeStaffId]
  );

  useEffect(() => {
    saveMockState(ACTIVE_STAFF_STORAGE_KEY, activeStaffId);
  }, [activeStaffId]);
  useEffect(() => {
    saveMockState(STAFF_USERS_STORAGE_KEY, staffUsers);
  }, [staffUsers]);

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
    if (!activeStaff) return false;
    return activeStaff.permissions.includes(permission);
  };

  const assertPermission = (permission: StaffPermission) => {
    if (!activeStaff) {
      return { ok: false as const, message: "Select staff PIN to continue." };
    }

    if (!activeStaff.permissions.includes(permission)) {
      return { ok: false as const, message: "You do not have permission to perform this action." };
    }

    return { ok: true as const };
  };

  const getStaffName = (staffId?: string | null) => {
    if (!staffId) return "Unknown";
    const staff = staffUsers.find((entry) => entry.id === staffId);
    return staff ? `${staff.firstName} ${staff.lastName}` : "Unknown";
  };

  const addInstructor = (input: { firstName: string; lastName: string; bio?: string; activeInstructor?: boolean }) => {
    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    if (!firstName || !lastName) return { ok: false, message: "First and last name are required." };
    const id = `staff_${Math.random().toString(36).slice(2, 9)}`;
    const instructor: StaffUser = {
      id,
      organizationId: "org_summit",
      locationIds: ["loc_001"],
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

  const value = useMemo<WorkstationStateContextValue>(
    () => ({
      staffUsers,
      activeStaff,
      pinModalOpen,
      pinError,
      pinTitle,
      requestStaffSwitch,
      closeStaffSwitch,
      switchStaffByPin,
      hasPermission,
      assertPermission,
      getStaffName,
      addInstructor,
      updateInstructor,
      toggleInstructorActive
    }),
    [staffUsers, activeStaff, pinModalOpen, pinError, pinTitle]
  );

  return <WorkstationStateContext.Provider value={value}>{children}</WorkstationStateContext.Provider>;
}

export function useWorkstationState() {
  const ctx = useContext(WorkstationStateContext);
  if (!ctx) throw new Error("useWorkstationState must be used within WorkstationStateProvider");
  return ctx;
}
