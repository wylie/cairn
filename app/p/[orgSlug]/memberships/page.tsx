"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCustomerPortalData } from "@/lib/portal/use-customer-portal-data";

export default function CustomerPortalMembershipsPage() {
  const { visibleCustomerIds, customerAccessRecords, accessProducts } = useCustomerPortalData();
  const records = customerAccessRecords.filter((entry) => visibleCustomerIds.includes(entry.customerId) && entry.type === "membership");

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Memberships</h2>
      {records.length === 0 ? <p className="text-sm text-muted-foreground">No memberships found.</p> : null}
      {records.map((entry) => {
        const product = accessProducts.find((product) => product.id === entry.productId);
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
          </Card>
        );
      })}
    </section>
  );
}
