import { CustomerStateProvider } from "@/lib/state/customer-state";
import { SettingsStateProvider } from "@/lib/state/settings-state";

export default function PublicPortalRootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <SettingsStateProvider>
      <CustomerStateProvider>
        <div className="min-h-screen bg-slate-50">{children}</div>
      </CustomerStateProvider>
    </SettingsStateProvider>
  );
}
