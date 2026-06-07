import type { Metadata } from "next";
import { SupportCenterLauncher } from "@/components/support/support-center-launcher";
import { SupportStateProvider } from "@/lib/state/support-state";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cairn Facility OS",
  description: "MVP for multi-tenant recreation facility operations"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SupportStateProvider>
          {children}
          <SupportCenterLauncher />
        </SupportStateProvider>
      </body>
    </html>
  );
}
