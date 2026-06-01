"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/transactions";
import { useCustomerPortalData } from "@/lib/portal/use-customer-portal-data";

export default function CustomerPortalPurchasesPage() {
  const { visibleCustomerIds, transactions } = useCustomerPortalData();
  const purchases = transactions.filter((entry) => (entry.customerId ? visibleCustomerIds.includes(entry.customerId) : false)).sort((a, b) => b.completedAt.localeCompare(a.completedAt));

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Purchase History</h2>
      <Card>
        <CardHeader><CardTitle>Receipts</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {purchases.length === 0 ? <p className="text-muted-foreground">No purchases yet.</p> : null}
          {purchases.map((purchase) => (
            <div key={purchase.id} className="rounded-md border p-3">
              <p className="font-medium">{purchase.receiptNumber}</p>
              <p>{new Date(purchase.completedAt).toLocaleString("en-US")}</p>
              <p>Total: {formatCurrency(purchase.total)}</p>
              <p>Items: {purchase.items.map((item) => item.productName).join(", ")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Link href={`/pos/receipts/${purchase.id}`} className="inline-flex h-9 items-center rounded-md border px-3 text-sm">View Receipt</Link>
                <Button variant="secondary" className="h-9">Download Receipt</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
