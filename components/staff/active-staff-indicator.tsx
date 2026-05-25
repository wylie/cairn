import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
    <div className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm text-muted-foreground">
      <span data-testid="active-staff-label">{label}</span>
      <Button variant="outline" size="sm" onClick={() => requestStaffSwitch("Switch Staff PIN")}>Switch</Button>
    </div>
  );
}
