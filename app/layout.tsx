import type { Metadata } from "next";
import { SupportCenterLauncher } from "@/components/support/support-center-launcher";
import {
  DEFAULT_SOCIAL_DESCRIPTION,
  DEFAULT_SOCIAL_TITLE,
  SITE_URL,
  buildSocialMetadata
} from "@/lib/metadata";
import { SupportStateProvider } from "@/lib/state/support-state";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: DEFAULT_SOCIAL_TITLE,
  description: DEFAULT_SOCIAL_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  icons: {
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
  ...buildSocialMetadata()
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
