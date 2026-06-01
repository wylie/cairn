"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCustomerPortalData } from "@/lib/portal/use-customer-portal-data";

export default function CustomerPortalHouseholdPage() {
  const { primaryCustomerId, households, householdMembers, customers, waivers, customerAccessRecords, registrations, sessions, programs } = useCustomerPortalData();
  const membership = householdMembers.find((entry) => entry.customerId === primaryCustomerId);
  const household = membership ? households.find((entry) => entry.id === membership.householdId) : undefined;
  const members = household ? householdMembers.filter((entry) => entry.householdId === household.id) : [];

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Household</h2>
      <Card>
        <CardHeader><CardTitle>{household?.householdName ?? "No Household Found"}</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {members.map((member) => {
            const customer = customers.find((entry) => entry.id === member.customerId);
            if (!customer) return null;
            const waiver = waivers.find((entry) => entry.customerId === customer.id);
            const access = customerAccessRecords.find((entry) => entry.customerId === customer.id && entry.status === "active");
            const upcoming = registrations
              .filter((entry) => entry.customerId === customer.id && entry.status !== "cancelled")
              .map((entry) => sessions.find((session) => session.id === entry.sessionId))
              .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
              .slice(0, 1)
              .map((session) => programs.find((program) => program.id === session.programId)?.title ?? session.title ?? "Session")
              .join(", ");
            return (
              <div key={member.customerId} className="rounded-md border p-3">
                <p className="font-medium">{customer.firstName} {customer.lastName}</p>
                <p>Relationship: {member.relationship}</p>
                <p>Waiver: {waiver?.status ?? "missing"}</p>
                <p>Membership: {access?.status ?? "none"}</p>
                <p>Upcoming Programs: {upcoming || "None"}</p>
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground">Guardian users can manage children and household registrations.</p>
        </CardContent>
      </Card>
    </section>
  );
}
