import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cairn Facility OS",
  description: "MVP for multi-tenant recreation facility operations"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
