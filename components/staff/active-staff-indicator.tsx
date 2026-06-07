import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { TOP_BAR_UTILITY_CONTROL_CLASS } from "@/components/layout/utility-header";
import { useWorkstationState } from "@/lib/state/workstation-state";

export function ActiveStaffIndicator() {
  const { activeStaff, requestStaffSwitch } = useWorkstationState();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const label = !mounted
    ? "No staff selected"
    : activeStaff
      ? `${activeStaff.initials} • ${activeStaff.firstName} ${activeStaff.lastName} (${activeStaff.role.replace("_", " ")})`
      : "No staff selected";

  return (
    <div className={`${TOP_BAR_UTILITY_CONTROL_CLASS} gap-2`}>
      <span data-testid="active-staff-label" className="truncate">{label}</span>
      <Button variant="outline" size="sm" className="h-10 rounded-md px-3" onClick={() => requestStaffSwitch("Switch Staff PIN")}>Switch</Button>
    </div>
  );
}
