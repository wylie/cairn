"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { staffUsers as seedStaffUsers } from "@/lib/mocks/staff";
import { buildScopedMockKey, loadMockState, saveMockState } from "@/lib/mock-storage";
import type { StaffPermission, StaffUser } from "@/types/domain";

const ACTIVE_STAFF_STORAGE_KEY = buildScopedMockKey("org_summit", "loc_001", "activeStaff");

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
}

const WorkstationStateContext = createContext<WorkstationStateContextValue | null>(null);

export function WorkstationStateProvider({ children }: { children: React.ReactNode }) {
  const [staffUsers] = useState<StaffUser[]>(seedStaffUsers.filter((staff) => staff.active));
  const [activeStaffId, setActiveStaffId] = useState<string | null>(null);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinError, setPinError] = useState("");
  const [pinTitle, setPinTitle] = useState("Switch Staff");

  const activeStaff = useMemo(
    () => staffUsers.find((staff) => staff.id === activeStaffId) ?? null,
    [staffUsers, activeStaffId]
  );

  useEffect(() => {
    const saved = loadMockState<string | null>(ACTIVE_STAFF_STORAGE_KEY, null);
    if (!saved) return;
    if (staffUsers.some((staff) => staff.id === saved)) {
      setActiveStaffId(saved);
    }
  }, [staffUsers]);

  useEffect(() => {
    saveMockState(ACTIVE_STAFF_STORAGE_KEY, activeStaffId);
  }, [activeStaffId]);

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
      getStaffName
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
