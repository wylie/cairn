"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCustomerPortalData } from "@/lib/portal/use-customer-portal-data";

export default function CustomerPortalDashboardPage() {
  const { primaryCustomer, visibleCustomerIds, customerAccessRecords, registrations, waivers, checkInRecords, transactions } = useCustomerPortalData();

  const activeMemberships = customerAccessRecords.filter((entry) => visibleCustomerIds.includes(entry.customerId) && entry.type === "membership" && entry.status === "active");
  const upcomingPrograms = registrations.filter((entry) => visibleCustomerIds.includes(entry.customerId) && ["confirmed", "waitlisted"].includes(entry.status));
  const visibleWaivers = waivers.filter((entry) => visibleCustomerIds.includes(entry.customerId));
  const visits = checkInRecords.filter((entry) => visibleCustomerIds.includes(entry.customerId));
  const purchases = transactions.filter((entry) => (entry.customerId ? visibleCustomerIds.includes(entry.customerId) : false));

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Welcome Back{primaryCustomer ? `, ${primaryCustomer.firstName}` : ""}</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <SummaryCard title="Active Memberships" value={activeMemberships.length} />
        <SummaryCard title="Upcoming Programs" value={upcomingPrograms.length} />
        <SummaryCard title="Waivers" value={visibleWaivers.length} />
        <SummaryCard title="Household Members" value={visibleCustomerIds.length} />
        <SummaryCard title="Recent Visits" value={visits.length} />
        <SummaryCard title="Recent Purchases" value={purchases.length} />
      </div>
      <Card>
        <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link className="inline-flex min-h-11 items-center rounded-md bg-primary px-3 text-sm text-primary-foreground" href="./registrations">Register for Program</Link>
          <Link className="inline-flex min-h-11 items-center rounded-md border px-3 text-sm" href="./waivers">Sign Waiver</Link>
          <Link className="inline-flex min-h-11 items-center rounded-md border px-3 text-sm" href="./memberships">View Membership</Link>
          <Link className="inline-flex min-h-11 items-center rounded-md border px-3 text-sm" href="./household">Manage Household</Link>
        </CardContent>
      </Card>
    </section>
  );
}

function SummaryCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent><p className="text-2xl font-semibold">{value}</p></CardContent>
    </Card>
  );
}
