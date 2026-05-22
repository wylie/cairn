"use client";

import type { StaffPermission } from "@/types/domain";
import { StaffSwitcher } from "@/components/staff/staff-switcher";
import { useWorkstationState } from "@/lib/state/workstation-state";

export function PermissionGate({
  permission,
  children,
  fallback
}: {
  permission: StaffPermission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { hasPermission } = useWorkstationState();

  if (hasPermission(permission)) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm text-amber-800">You do not have permission to perform this action.</p>
      <div className="mt-3">
        <StaffSwitcher label="Switch Staff" />
      </div>
    </div>
  );
}
