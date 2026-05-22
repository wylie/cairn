"use client";

import { useWorkstationState } from "@/lib/state/workstation-state";

export function StaffAttributionLabel({
  label,
  staffId,
  fallbackName
}: {
  label: string;
  staffId?: string | null;
  fallbackName?: string | null;
}) {
  const { getStaffName } = useWorkstationState();
  const resolved = getStaffName(staffId);
  const name = resolved === "Unknown" && fallbackName ? fallbackName : resolved;
  const displayName = name === "Unknown" ? "Staff not recorded" : name;

  return (
    <p>
      {label}: {displayName}
    </p>
  );
}
