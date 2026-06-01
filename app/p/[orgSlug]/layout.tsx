import type { Metadata } from "next";
import { CustomerStateProvider } from "@/lib/state/customer-state";
import { SettingsStateProvider } from "@/lib/state/settings-state";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
};

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
