import type { Metadata } from "next";
import { CustomerStateProvider } from "@/lib/state/customer-state";
import { SettingsStateProvider } from "@/lib/state/settings-state";
import { PublicCartProvider } from "@/lib/public-cart";

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
        <PublicCartProvider>
          <div className="min-h-screen bg-slate-50">{children}</div>
        </PublicCartProvider>
      </CustomerStateProvider>
    </SettingsStateProvider>
  );
}
