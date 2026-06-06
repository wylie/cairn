"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCustomerPortalData } from "@/lib/portal/use-customer-portal-data";
import { Button } from "@/components/ui/button";
import { CustomerPortalContainer } from "@/components/portal/customer-portal-container";

export default function CustomerPortalMembershipsPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params?.orgSlug ?? "summit";
  const { visibleCustomerIds, customerAccessRecords, accessProducts, memberships } = useCustomerPortalData();
  const records = customerAccessRecords.filter((entry) => visibleCustomerIds.includes(entry.customerId) && entry.type === "membership");

  return (
    <CustomerPortalContainer>
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Memberships</h2>
      {records.length === 0 ? <p className="text-sm text-muted-foreground">No memberships found.</p> : null}
      {records.map((entry) => {
        const product = accessProducts.find((product) => product.id === entry.productId);
        const membership = memberships.find((row) => row.customerId === entry.customerId && row.planName === (product?.name ?? entry.notes));
        return (
          <Card key={entry.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span>{product?.name ?? entry.notes ?? "Membership"}</span>
                <Badge tone={entry.status === "active" ? "success" : entry.status === "frozen" ? "warning" : "danger"}>{entry.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm md:grid-cols-2">
              <p><span className="text-muted-foreground">Purchase Date:</span> {entry.purchaseDate ?? entry.startDate}</p>
              <p><span className="text-muted-foreground">Expiration Date:</span> {entry.expirationDate ?? "Not set"}</p>
              <p><span className="text-muted-foreground">Benefits:</span> Facility access</p>
              <p><span className="text-muted-foreground">Access Rules:</span> {entry.locationsAllowed?.join(", ") ?? "All locations"}</p>
            </CardContent>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/p/${orgSlug}/memberships/${membership?.id ?? entry.id}`}
                  className="inline-flex h-9 items-center rounded-md border px-3 text-sm"
                >
                  View membership details
                </Link>
                <Link
                  href={`/p/${orgSlug}/membership-card?customerId=${entry.customerId}`}
                  className="inline-flex h-9 items-center rounded-md border px-3 text-sm"
                >
                  View membership card
                </Link>
                <Button variant="secondary" className="h-9">View billing history</Button>
                <Button variant="secondary" className="h-9">Download agreement (Soon)</Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </section>
    </CustomerPortalContainer>
  );
}
