import { AppShell } from "@/components/layout/app-shell";
import { CustomerStateProvider } from "@/lib/state/customer-state";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  // TODO(auth): enforce staff authentication and org-scoped sessions with Supabase Auth.
  return (
    <CustomerStateProvider>
      <AppShell>{children}</AppShell>
    </CustomerStateProvider>
  );
}
