"use client";

import { useMemo, useState } from "react";
import type { Customer, PosTransaction } from "@/types/domain";
import { CustomerSearchCombobox } from "@/components/shared/customer-search-combobox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ModalShell } from "@/components/ui/modal-shell";
import { filterCustomers } from "@/lib/data/customer-search";

export function PostSaleCheckInPanel({
  transaction,
  customers,
  open,
  onClose,
  onAssignCustomer,
  onCheckInSlot,
  getSlotCheckInState,
  onDone,
  onAddCustomer,
  onMarkWaiverSigned
}: {
  transaction: PosTransaction;
  customers: Customer[];
  open: boolean;
  onClose: () => void;
  onAssignCustomer: (slotId: string, customerId: string) => { ok: boolean; message: string };
  onCheckInSlot: (slotId: string) => { ok: boolean; message: string };
  onMarkWaiverSigned: (slotId: string) => { ok: boolean; message: string };
  getSlotCheckInState: (slotId: string) => {
    canCheckIn: boolean;
    reason?: string;
    actionLabel: "Check In" | "Manager Override + Check In" | "Manager Required";
    statusLabel: "Available" | "Blocked" | "Checked In";
    blockedByWaiver?: boolean;
  };
  onDone: () => void;
  onAddCustomer?: () => void;
}) {
  const [feedback, setFeedback] = useState("");
  const [warning, setWarning] = useState("");
  const [queries, setQueries] = useState<Record<string, string>>({});
  const slots = transaction.checkInSlots ?? [];
  const availableSlots = slots.filter((slot) => slot.status === "available");

  const eligibleCount = slots.length;
  const checkedInCount = slots.filter((slot) => slot.status === "checked-in").length;

  const getResults = (slotId: string) => {
    const query = queries[slotId] ?? "";
    if (!query.trim()) return [];
    return filterCustomers(customers, query).slice(0, 8);
  };

  const title = useMemo(() => {
    if (eligibleCount <= 1) return "Check In Now";
    return `Assign Check-ins (${checkedInCount}/${eligibleCount})`;
  }, [eligibleCount, checkedInCount]);

  if (eligibleCount === 0 || !open) return null;
  const hasWaiverBlock = slots.some((slot) => getSlotCheckInState(slot.id).blockedByWaiver);

  return (
    <ModalShell
      open={open}
      ariaLabel="Post-sale check-in"
      title={title}
      description={`Receipt #${transaction.receiptNumber} • ${transaction.customerName} • ${eligibleCount} eligible check-in${eligibleCount === 1 ? "" : "s"}`}
      onClose={onClose}
      maxWidthClassName="max-w-3xl"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" className="min-h-11" onClick={onClose}>Close</Button>
          <Button variant="secondary" className="min-h-11" onClick={onDone}>Done</Button>
        </div>
      }
    >
      <div className="space-y-3">
        {hasWaiverBlock ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
            <p className="font-medium">Waiver required before check-in</p>
            <p className="text-sm">This customer does not have a valid waiver on file.</p>
          </div>
        ) : null}

        <div className="space-y-3">
          {slots.map((slot, index) => {
            const slotState = getSlotCheckInState(slot.id);
            return (
            <article key={slot.id} className="space-y-2 rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">Slot {index + 1}: {slot.productName}</p>
                  <p className="text-sm text-muted-foreground">{slot.assignedCustomerName ?? "No customer assigned"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={slotState.statusLabel === "Checked In" ? "success" : slotState.statusLabel === "Blocked" ? "warning" : "muted"}>
                    {slotState.statusLabel}
                  </Badge>
                  {slot.status === "available" ? (
                    <Button
                      variant={slotState.actionLabel.includes("Override") ? "caution" : "primary"}
                      className="min-h-11"
                      disabled={!slot.assignedCustomerId || !slotState.canCheckIn}
                      onClick={() => {
                        const result = onCheckInSlot(slot.id);
                        if (result.ok) {
                          setWarning("");
                          setFeedback(result.message);
                        } else {
                          setFeedback("");
                          setWarning(result.message);
                        }
                      }}
                    >
                      {slotState.actionLabel}
                    </Button>
                  ) : null}
                </div>
              </div>

              {slot.status === "available" && !slot.assignedCustomerId ? (
                <div className="space-y-2">
                  <CustomerSearchCombobox
                    label={`Assign customer for slot ${index + 1}`}
                    placeholder="Search customer by name, member ID, phone, or email"
                    query={queries[slot.id] ?? ""}
                    onQueryChange={(value) => setQueries((prev) => ({ ...prev, [slot.id]: value }))}
                    customers={getResults(slot.id)}
                    onSelect={(customerId) => {
                      const result = onAssignCustomer(slot.id, customerId);
                      if (result.ok) {
                        setQueries((prev) => ({ ...prev, [slot.id]: "" }));
                        setWarning("");
                        setFeedback(result.message);
                      } else {
                        setFeedback("");
                        setWarning(result.message);
                      }
                    }}
                    onAddCustomer={onAddCustomer}
                    emptyMessage="No customers found"
                  />
                  <p className="text-xs text-muted-foreground">Create or select a customer to check in.</p>
                </div>
              ) : null}
              {slot.status === "available" && slot.assignedCustomerId && (!slotState.canCheckIn || slotState.blockedByWaiver) ? (
                <div className="space-y-2">
                  <p className="text-xs text-amber-800">{slotState.reason ?? "Unable to check in this slot."}</p>
                  {slotState.blockedByWaiver ? (
                    <Button
                      className="min-h-11"
                      variant="secondary"
                      onClick={() => {
                        const result = onMarkWaiverSigned(slot.id);
                        if (result.ok) {
                          setWarning("");
                          setFeedback(result.message);
                        } else {
                          setFeedback("");
                          setWarning(result.message);
                        }
                      }}
                    >
                      Mark Waiver Signed
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </article>
            );
          })}
        </div>

        {feedback ? <p role="status" className="text-sm text-emerald-800">{feedback}</p> : null}
        {warning ? <p role="alert" className="text-sm text-amber-800">{warning}</p> : null}
        {availableSlots.length > 1 ? <p className="text-xs text-muted-foreground">Guest check-in assignments are limited during the pilot.</p> : null}
      </div>
    </ModalShell>
  );
}
