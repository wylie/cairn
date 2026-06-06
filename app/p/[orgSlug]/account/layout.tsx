import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
};

const NAV_ITEMS = [
  { href: "dashboard", label: "Dashboard" },
  { href: "memberships", label: "Memberships" },
  { href: "membership-card", label: "Membership Card" },
  { href: "../rentals", label: "Rentals" },
  { href: "billing", label: "Billing" },
  { href: "registrations", label: "Programs" },
  { href: "../store", label: "Shop" },
  { href: "waivers", label: "Waivers" },
  { href: "household", label: "Household" },
  { href: "visits", label: "Visits" },
  { href: "purchases", label: "Purchases" },
  { href: "facility", label: "Facility Info" }
];

export default async function CustomerAccountLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Cairn Customer Portal</p>
            <h1 className="text-lg font-semibold">Welcome Back</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link className="inline-flex min-h-11 items-center rounded-md border px-3 text-sm" href={`/p/${orgSlug}/programs`}>Program Catalog</Link>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl flex-wrap gap-2 px-4 pb-3">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href.startsWith("../") ? `/p/${orgSlug}/${item.href.slice(3)}` : `/p/${orgSlug}/account/${item.href}`} className="inline-flex min-h-10 items-center rounded-md border bg-white px-3 text-sm hover:bg-secondary">
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
