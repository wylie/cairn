"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getLocationName } from "@/lib/public-programs";
import { canCustomerViewReceipt, getReceiptStatus, getReceiptStatusLabel } from "@/lib/portal/receipts";
import { formatDateTime } from "@/lib/format/date";
import { formatCurrency } from "@/lib/transactions";
import { useCustomerPortalData } from "@/lib/portal/use-customer-portal-data";
import { CustomerPortalContainer } from "@/components/portal/customer-portal-container";

export default function CustomerPortalPurchasesPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { visibleCustomerIds, transactions, customers } = useCustomerPortalData();
  const customerNameById = new Map(customers.map((entry) => [entry.id, `${entry.firstName} ${entry.lastName}`]));
  const purchases = transactions
    .filter((entry) => canCustomerViewReceipt(entry, visibleCustomerIds))
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));

  const toneForStatus = (status: ReturnType<typeof getReceiptStatus>) => {
    if (status === "refunded" || status === "voided") return "danger";
    if (status === "pending" || status === "partially_refunded") return "warning";
    if (status === "comped") return "muted";
    return "success";
  };

  return (
    <CustomerPortalContainer>
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Purchase History</h2>
      <Card>
        <CardHeader><CardTitle>Receipts</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {purchases.length === 0 ? <p className="text-muted-foreground">No purchases yet.</p> : null}
          {purchases.map((purchase) => (
            <div key={purchase.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{purchase.receiptNumber}</p>
                <Badge tone={toneForStatus(getReceiptStatus(purchase))}>{getReceiptStatusLabel(getReceiptStatus(purchase))}</Badge>
              </div>
              <p>{formatDateTime(purchase.completedAt)}</p>
              <p>Summary: {purchase.items.slice(0, 2).map((item) => item.productName).join(", ")}{purchase.items.length > 2 ? ` +${purchase.items.length - 2} more` : ""}</p>
              <p>Total: {formatCurrency(purchase.total)}</p>
              <p>Payment: {purchase.paymentType.replaceAll("_", " ")}</p>
              <p>Location: {getLocationName(purchase.locationId)}</p>
              <p>
                Purchased by: {purchase.purchaserCustomerName ?? purchase.customerName}
              </p>
              <p>
                Purchased for: {(purchase.purchasedForCustomerIds ?? [])
                  .map((id) => customerNameById.get(id) ?? id)
                  .join(", ") || "Not recorded"}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Link href={`/p/${orgSlug}/purchases/${purchase.id}`} className="inline-flex h-9 items-center rounded-md border px-3 text-sm">View Receipt</Link>
                <Button variant="secondary" className="h-9" onClick={() => window.print()}>Print Receipt</Button>
                <Button variant="secondary" className="h-9">Download PDF (Soon)</Button>
                <Button variant="secondary" className="h-9">Email Receipt (Soon)</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
    </CustomerPortalContainer>
  );
}
