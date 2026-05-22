"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SearchInput } from "@/components/shared/search-input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCustomerState } from "@/lib/state/customer-state";
import { formatCurrency } from "@/lib/transactions";
import { useWorkstationState } from "@/lib/state/workstation-state";

export default function PosHistoryPage() {
  const { transactions, customers } = useCustomerState();
  const { staffUsers } = useWorkstationState();
  const [query, setQuery] = useState("");

  const customerById = useMemo(
    () => new Map(customers.map((customer) => [customer.id, `${customer.firstName} ${customer.lastName}`])),
    [customers]
  );
  const staffById = useMemo(
    () => new Map(staffUsers.map((staff) => [staff.id, `${staff.firstName} ${staff.lastName}`])),
    [staffUsers]
  );
  const resolveCustomerName = (transaction: (typeof transactions)[number]) => {
    const fromRecord = transaction.customerName?.trim();
    if (fromRecord && fromRecord.toLowerCase() !== "unknown customer") return fromRecord;
    const fromLookup = customerById.get(transaction.customerId)?.trim();
    return fromLookup || "Unknown customer";
  };
  const resolveStaffName = (transaction: (typeof transactions)[number]) => {
    const fromRecord = transaction.soldByStaffName?.trim();
    if (fromRecord && fromRecord.toLowerCase() !== "unknown") return fromRecord;
    const fromLookup = transaction.soldByStaffId ? staffById.get(transaction.soldByStaffId)?.trim() : "";
    return fromLookup || "Staff not recorded";
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter((transaction) => {
      const displayCustomerName = resolveCustomerName(transaction);
      const displayStaffName = resolveStaffName(transaction);
      const haystack = [
        displayCustomerName,
        displayStaffName,
        transaction.receiptNumber,
        ...(transaction.items ?? []).map((item) => item.productName ?? "Unknown item")
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [transactions, query, customerById, staffById]);

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">POS Sales History</h2>
          <p className="text-sm text-muted-foreground">Review completed sales with customer, staff, item, and receipt attribution.</p>
        </div>
        <Link href="/pos" className="text-sm text-muted-foreground underline">Back to POS</Link>
      </header>

      <div data-testid="sales-history-filterbar" className="grid items-end gap-3 md:grid-cols-[1.4fr_1fr]">
        <SearchInput
          value={query}
          onChange={setQuery}
          label="Search sales history"
          placeholder="Search customer, staff, product, or receipt"
          showLabel
        />
        <label className="space-y-1 text-sm">
          <span className="text-sm text-muted-foreground">Date filter (placeholder)</span>
          <select aria-label="Date filter" className="flex h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm">
            <option>All dates</option>
            <option>Today</option>
            <option>Last 7 days</option>
            <option>Last 30 days</option>
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No sales found</CardTitle>
            <CardDescription>Completed sales will appear here once POS transactions are recorded.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered
            .slice()
            .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
            .map((transaction) => {
              const displayCustomerName = resolveCustomerName(transaction);
              const displayStaffName = resolveStaffName(transaction);
              const items = transaction.items ?? [];
              const calculatedFromItems = items.reduce((sum, item) => sum + (item.lineTotal ?? 0), 0);
              const displayTotal = transaction.total > 0 || calculatedFromItems === 0 ? transaction.total : calculatedFromItems;

              return (
              <Card key={transaction.id}>
                <CardContent className="grid gap-3 p-4 md:grid-cols-[1.1fr_1fr_0.7fr]">
                  <div>
                    <p className="font-medium">{displayCustomerName}</p>
                    <p className="text-xs text-muted-foreground">Receipt #{transaction.receiptNumber}</p>
                    <p className="text-xs text-muted-foreground">{new Date(transaction.completedAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm">Sold by {displayStaffName}</p>
                    <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                      {items.map((item, index) => (
                        <li key={`${transaction.id}-${item.productId}-${index}`}>
                          {(item.productName ?? "Unknown item")} x{item.quantity ?? 1} — {formatCurrency(item.unitPrice)} ({formatCurrency(item.lineTotal)})
                        </li>
                      ))}
                      {items.length === 0 ? <li>Unknown item</li> : null}
                    </ul>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="font-medium">Total: {formatCurrency(displayTotal)}</p>
                    <p className="text-xs text-muted-foreground">{items.length} item(s)</p>
                  </div>
                </CardContent>
              </Card>
              );
            })}
        </div>
      )}
    </section>
  );
}
