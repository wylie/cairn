import { CustomerBadges } from "@/components/customers/customer-badges";
import { ActivityTimeline } from "@/components/customers/activity-timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { data } from "@/lib/data";
import {
  getMembershipForCustomer,
  getPassForCustomer,
  getRecentCheckInsForCustomer,
  getWaiverForCustomer
} from "@/lib/data/selectors";
import { notFound } from "next/navigation";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = data.customers.find((entry) => entry.id === id);
  if (!customer) notFound();

  const membership = getMembershipForCustomer(customer);
  const waiver = getWaiverForCustomer(customer);
  const pass = getPassForCustomer(customer);
  const recentCheckIns = getRecentCheckInsForCustomer(customer.id);

  return (
    <div className="space-y-4">
      <Card aria-label="detail-header">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border bg-secondary text-sm font-semibold text-muted-foreground">
                {customer.firstName[0]}{customer.lastName[0]}
              </div>
              <div>
                <h2 className="text-2xl font-semibold">{customer.firstName} {customer.lastName}</h2>
                <p className="text-sm text-muted-foreground">{customer.memberId}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant={customer.checkInStatus === "in" ? "outline" : "default"}>
                {customer.checkInStatus === "in" ? "Check Out" : "Check In"}
              </Button>
              <Button variant="outline">Edit Profile</Button>
            </div>
          </div>
          <div className="mt-3">
            <CustomerBadges customer={customer} membership={membership} punchPass={pass} waiver={waiver} />
          </div>
        </CardContent>
      </Card>

      <Card aria-label="detail-membership">
        <CardHeader><CardTitle>Membership</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>Plan/Pass: {membership?.planName ?? pass?.title ?? customer.dayPassProductName ?? "None"}</p>
          <p>Expiration: {membership?.renewalDate ?? pass?.expiresAt ?? "N/A"}</p>
          <p>Remaining Punches: {typeof pass?.remainingUses === "number" ? `${pass.remainingUses} of ${pass.originalUses}` : "N/A"}</p>
        </CardContent>
      </Card>

      <Card aria-label="detail-waivers">
        <CardHeader><CardTitle>Waivers</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>{waiver?.status === "signed" ? "Signed" : "Waiver Missing"}</p>
          <p>Expiration: {waiver?.expiresAt ?? "N/A"}</p>
        </CardContent>
      </Card>

      <Card aria-label="detail-activity">
        <CardHeader><CardTitle>Activity</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ActivityTimeline visits={recentCheckIns} />
        </CardContent>
      </Card>

      <Card aria-label="detail-notes">
        <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">{customer.notes ?? "No internal notes yet."}</p></CardContent>
      </Card>

      <Card aria-label="detail-billing">
        <CardHeader><CardTitle>Billing</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Stripe-ready placeholder. Billing timeline and invoices will appear here.</p></CardContent>
      </Card>
    </div>
  );
}
