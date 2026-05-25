"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { useCustomerState } from "@/lib/state/customer-state";
import { useWorkstationState } from "@/lib/state/workstation-state";
import { formatCurrency } from "@/lib/transactions";

export default function ReceiptDetailPage() {
  const { transactionId } = useParams<{ transactionId: string }>();
  const { transactions, refundTransaction } = useCustomerState();
  const { activeStaff, hasPermission } = useWorkstationState();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState("Customer request");
  const [feedback, setFeedback] = useState("");
  const [warning, setWarning] = useState("");

  const receipt = useMemo(
    () => transactions.find((entry) => entry.id === transactionId),
    [transactions, transactionId]
  );

  if (!receipt) {
    return (
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Receipt not found</h2>
        <Link className="text-sm underline" href="/pos/history">Back to Sales History</Link>
      </section>
    );
  }

  const canRefund = hasPermission("refundTransaction") && receipt.transactionType === "sale";

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Receipt {receipt.receiptNumber}</h2>
          <p className="text-sm text-muted-foreground">{new Date(receipt.completedAt).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/pos/history" className="text-sm underline">Back to Sales History</Link>
          {canRefund ? (
            <Button variant="destructiveSubtle" className="min-h-11" onClick={() => setConfirmOpen(true)}>
              Refund
            </Button>
          ) : null}
        </div>
      </header>

      <div className="rounded-xl border bg-card p-4">
        <div className="grid gap-2 text-sm md:grid-cols-2">
          <p><span className="text-muted-foreground">Customer:</span> {receipt.customerName || "Unknown customer"}</p>
          <p><span className="text-muted-foreground">Staff:</span> {receipt.soldByStaffName || "Staff not recorded"}</p>
          <p><span className="text-muted-foreground">Location:</span> {receipt.locationId}</p>
          <p><span className="text-muted-foreground">Payment:</span> {receipt.paymentType.replace(/_/g, " ")}</p>
          <p><span className="text-muted-foreground">Processor:</span> {receipt.paymentProcessor || "Mock Payments"}</p>
          <p><span className="text-muted-foreground">Approval:</span> {receipt.paymentApprovalCode || "—"}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <h3 className="font-semibold">Line Items</h3>
        <ul className="mt-2 space-y-2">
          {receipt.items.map((item, index) => (
            <li key={`${item.productId}-${index}`} className="rounded-md border bg-secondary/30 p-2 text-sm">
              <p className="font-medium">{item.productName}</p>
              <p className="text-muted-foreground">Category: {item.category} • Type: {item.type}</p>
              <p className="text-muted-foreground">Qty {item.quantity} × {formatCurrency(item.unitPrice)} = {formatCurrency(item.lineTotal)}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border bg-card p-4 text-sm">
        <div className="flex items-center justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(receipt.subtotal)}</span></div>
        <div className="flex items-center justify-between"><span className="text-muted-foreground">Refunded</span><span>{formatCurrency(receipt.refundedTotal ?? 0)}</span></div>
        <div className="mt-1 flex items-center justify-between font-semibold"><span>Total</span><span>{formatCurrency(receipt.total)}</span></div>
      </div>

      {feedback ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{feedback}</p> : null}
      {warning ? <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{warning}</p> : null}

      <ModalShell
        open={confirmOpen}
        ariaLabel="Refund transaction"
        title="Refund transaction"
        description="This creates a return transaction and preserves sale history."
        onClose={() => setConfirmOpen(false)}
        maxWidthClassName="max-w-lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" className="min-h-11" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              className="min-h-11"
              onClick={() => {
                if (!activeStaff) {
                  setWarning("Select staff PIN to continue.");
                  return;
                }
                const result = refundTransaction({
                  transactionId: receipt.id,
                  reason,
                  staffId: activeStaff.id,
                  staffName: `${activeStaff.firstName} ${activeStaff.lastName}`
                });
                if (!result.ok) {
                  setWarning(result.message);
                  return;
                }
                setFeedback(result.message);
                setWarning("");
                setConfirmOpen(false);
              }}
            >
              Confirm Refund
            </Button>
          </div>
        }
      >
        <label htmlFor="refund-reason" className="text-sm font-medium">Refund reason</label>
        <textarea
          id="refund-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="mt-2 min-h-24 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
        />
      </ModalShell>
    </section>
  );
}
