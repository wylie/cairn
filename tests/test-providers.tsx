import { CustomerStateProvider } from "@/lib/state/customer-state";
import { SettingsStateProvider } from "@/lib/state/settings-state";
import { WorkstationStateProvider } from "@/lib/state/workstation-state";
import { StaffPinModal } from "@/components/staff/staff-pin-modal";

export function TestProviders({ children }: { children: React.ReactNode }) {
  return (
    <WorkstationStateProvider>
      <SettingsStateProvider>
        <CustomerStateProvider>
          {children}
          <StaffPinModal />
        </CustomerStateProvider>
      </SettingsStateProvider>
    </WorkstationStateProvider>
  );
}
