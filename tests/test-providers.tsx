import { CustomerStateProvider } from "@/lib/state/customer-state";
import { WorkstationStateProvider } from "@/lib/state/workstation-state";
import { StaffPinModal } from "@/components/staff/staff-pin-modal";

export function TestProviders({ children }: { children: React.ReactNode }) {
  return (
    <WorkstationStateProvider>
      <CustomerStateProvider>
        {children}
        <StaffPinModal />
      </CustomerStateProvider>
    </WorkstationStateProvider>
  );
}
