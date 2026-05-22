import { Button } from "@/components/ui/button";
import { useWorkstationState } from "@/lib/state/workstation-state";

export function StaffSwitcher({ label = "Switch Staff", title = "Switch Staff PIN", variant = "outline" as const }) {
  const { requestStaffSwitch } = useWorkstationState();

  return (
    <Button variant={variant} onClick={() => requestStaffSwitch(title)}>
      {label}
    </Button>
  );
}
