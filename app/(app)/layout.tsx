import { AppShell } from "@/components/layout/app-shell";
import { StaffPinModal } from "@/components/staff/staff-pin-modal";
import { CustomerStateProvider } from "@/lib/state/customer-state";
import { WorkstationStateProvider } from "@/lib/state/workstation-state";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  // TODO(auth): enforce staff authentication and org-scoped sessions with Supabase Auth.
  return (
    <WorkstationStateProvider>
      <CustomerStateProvider>
        <AppShell>{children}</AppShell>
        <StaffPinModal />
      </CustomerStateProvider>
    </WorkstationStateProvider>
  );
}
