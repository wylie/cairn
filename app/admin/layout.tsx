import type { Metadata } from "next";
import { PlatformAdminShell } from "@/components/admin/platform-admin-shell";
import { PlatformAdminStateProvider } from "@/lib/state/platform-admin-state";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlatformAdminStateProvider>
      <PlatformAdminShell>{children}</PlatformAdminShell>
    </PlatformAdminStateProvider>
  );
}
