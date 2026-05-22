import { Button } from "@/components/ui/button";
import { useWorkstationState } from "@/lib/state/workstation-state";

export function ActiveStaffIndicator() {
  const { activeStaff, requestStaffSwitch } = useWorkstationState();

  return (
    <div className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm text-muted-foreground">
      <span data-testid="active-staff-label">
        {activeStaff ? `${activeStaff.initials} • ${activeStaff.firstName} ${activeStaff.lastName} (${activeStaff.role.replace("_", " ")})` : "No staff selected"}
      </span>
      <Button variant="outline" size="sm" onClick={() => requestStaffSwitch("Switch Staff PIN")}>Switch</Button>
    </div>
  );
}
