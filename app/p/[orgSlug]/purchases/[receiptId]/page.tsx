"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format/date";
import { canCustomerViewReceipt, getReceiptStatus, getReceiptStatusLabel } from "@/lib/portal/receipts";
import { useCustomerPortalData } from "@/lib/portal/use-customer-portal-data";
import { getLocationName } from "@/lib/public-programs";
import { formatCurrency } from "@/lib/transactions";

export default function CustomerPortalReceiptDetailPage() {
  const { receiptId, orgSlug } = useParams<{ receiptId: string; orgSlug: string }>();
  const { transactions, visibleCustomerIds, customers } = useCustomerPortalData();
  const receipt = transactions.find((entry) => entry.id === receiptId);

  if (!receipt || !canCustomerViewReceipt(receipt, visibleCustomerIds)) {
    return (
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Receipt not available</h2>
        <p className="text-sm text-muted-foreground">This receipt is not visible for your account.</p>
        <Link className="text-sm underline" href="../purchases">Back to Purchases</Link>
      </section>
    );
  }

  const status = getReceiptStatus(receipt);
  const organizationName = orgSlug ? `${orgSlug.charAt(0).toUpperCase()}${orgSlug.slice(1)} Rec Collective` : "Facility";
  const toneForStatus = status === "refunded" || status === "voided"
    ? "danger"
    : status === "pending" || status === "partially_refunded"
    ? "warning"
    : status === "comped"
    ? "muted"
    : "success";
  const purchasedForNames = (receipt.purchasedForCustomerIds ?? [])
    .map((id) => customers.find((entry) => entry.id === id))
    .filter(Boolean)
    .map((entry) => `${entry!.firstName} ${entry!.lastName}`);
  const discount = receipt.discountCents ? receipt.discountCents / 100 : 0;
  const tax = receipt.taxCents ? receipt.taxCents / 100 : 0;
  const comp = receipt.compCents ? receipt.compCents / 100 : 0;
  const refunds = receipt.refundedTotal ?? 0;
  const totalPaid = status === "pending" ? 0 : Math.max(0, receipt.total - refunds);
  const balanceDue = status === "pending" ? receipt.total : 0;

  return (
    <section className="space-y-4 print:space-y-2">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-semibold">Receipt {receipt.receiptNumber}</h2>
          <p className="text-sm text-muted-foreground">{formatDateTime(receipt.completedAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={toneForStatus}>{getReceiptStatusLabel(status)}</Badge>
          <Button variant="secondary" onClick={() => window.print()}>Print Receipt</Button>
          <Button variant="secondary">Download PDF (Soon)</Button>
          <Button variant="secondary">Email Receipt (Soon)</Button>
        </div>
      </header>

      <Card className="print:shadow-none">
        <CardHeader>
          <CardTitle>{organizationName}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-2">
          <p><span className="text-muted-foreground">Receipt #:</span> {receipt.receiptNumber}</p>
          <p><span className="text-muted-foreground">Location:</span> {getLocationName(receipt.locationId)}</p>
          <p><span className="text-muted-foreground">Purchaser:</span> {receipt.purchaserCustomerName ?? receipt.customerName}</p>
          <p><span className="text-muted-foreground">Purchased for:</span> {purchasedForNames.join(", ") || "Not recorded"}</p>
          <p><span className="text-muted-foreground">Staff / Source:</span> {receipt.soldByStaffName ?? "Portal"}</p>
          <p><span className="text-muted-foreground">Payment method:</span> {receipt.paymentType.replaceAll("_", " ")}</p>
        </CardContent>
      </Card>

      <Card className="print:shadow-none">
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {receipt.items.map((item, index) => (
            <div key={`${item.productId}-${index}`} className="rounded-md border p-2">
              <p className="font-medium">{item.productName}</p>
              <p className="text-muted-foreground">{item.category} · {item.type}</p>
              <p className="text-muted-foreground">Qty {item.quantity} · Unit {formatCurrency(item.unitPrice)} · Line {formatCurrency(item.lineTotal)}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="print:shadow-none">
        <CardHeader>
          <CardTitle>Totals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(receipt.subtotal)}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Discounts</span><span>{formatCurrency(discount)}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Tax</span><span>{formatCurrency(tax)}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Comp</span><span>{formatCurrency(comp)}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Refunds</span><span>{formatCurrency(refunds)}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Total Paid</span><span>{formatCurrency(totalPaid)}</span></div>
          <div className="flex items-center justify-between font-semibold"><span>Balance Due</span><span>{formatCurrency(balanceDue)}</span></div>
        </CardContent>
      </Card>

      <Link href="../purchases" className="inline-flex text-sm underline">Back to Purchases</Link>
    </section>
  );
}
