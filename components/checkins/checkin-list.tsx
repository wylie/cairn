"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AddCustomerModal } from "@/components/customers/add-customer-modal";
import { EmptyState } from "@/components/shared/empty-state";
import { CustomerSearchCombobox } from "@/components/shared/customer-search-combobox";
import { CheckInRow } from "@/components/checkins/checkin-row";
import { SellAccessModal } from "@/components/pos/sell-access-modal";
import { StaffSwitcher } from "@/components/staff/staff-switcher";
import { useCustomerState } from "@/lib/state/customer-state";
import { useWorkstationState } from "@/lib/state/workstation-state";

export function CheckInList() {
  const {
    activeDateKey,
    isActiveDateToday,
    goToNextDay,
    goToPreviousDay,
    setToday,
    todayLogRecords,
    occupancyCount,
    totalCheckIns,
    checkedOutCount,
    searchCustomers,
    customers,
    accessProducts,
    checkInCustomer,
    checkOutRecord,
    sellAccessProducts,
    addCustomer
  } = useCustomerState();
  const { activeStaff, assertPermission, requestStaffSwitch, hasPermission } = useWorkstationState();

  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState<string>("");
  const [warning, setWarning] = useState<string>("");
  const [showSwitchPrompt, setShowSwitchPrompt] = useState(false);
  const [sellCustomerId, setSellCustomerId] = useState<string | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const sellCustomer = useMemo(() => customers.find((entry) => entry.id === sellCustomerId) ?? null, [customers, sellCustomerId]);

  const results = useMemo(() => searchCustomers(query), [searchCustomers, query]);

  const handleSelect = (customerId: string) => {
    const permission = assertPermission("checkInCustomer");
    if (!permission.ok) {
      setWarning(permission.message);
      setShowSwitchPrompt(true);
      requestStaffSwitch("Staff PIN Required");
      return;
    }

    const staffName = `${activeStaff!.firstName} ${activeStaff!.lastName}`;
    const result = checkInCustomer(customerId, { staffUserId: activeStaff!.id, staffName, source: "manual_search" });
    if (!result.ok) {
      setWarning(result.message);
      setFeedback("");
      setShowSwitchPrompt(result.message.includes("no valid access method"));
      if (result.message.includes("no valid access method")) setSellCustomerId(customerId);
      return;
    }
    setFeedback(result.message);
    setWarning("");
    setShowSwitchPrompt(false);
    setQuery("");
  };

  const handleCheckOut = (recordId: string) => {
    const permission = assertPermission("checkOutCustomer");
    if (!permission.ok) {
      setWarning(permission.message);
      setShowSwitchPrompt(true);
      requestStaffSwitch("Staff PIN Required");
      return;
    }

    const result = checkOutRecord(recordId, activeStaff!.id, `${activeStaff!.firstName} ${activeStaff!.lastName}`);
    if (!result.ok) {
      setWarning(result.message);
      setFeedback("");
      return;
    }
    setFeedback(result.message);
    setWarning("");
    setShowSwitchPrompt(false);
  };

  return (
    <section className="space-y-4">
      <header className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Daily Log</p>
            <h3 className="text-xl font-semibold">{isActiveDateToday ? "Today" : activeDateKey}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={goToPreviousDay} aria-label="Previous Day">Previous</Button>
            <Button variant="outline" onClick={setToday}>Today</Button>
            <Button variant="outline" onClick={goToNextDay} aria-label="Next Day">Next</Button>
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <p data-testid="occupancy-count" className="rounded-md bg-secondary px-3 py-2 text-sm">{occupancyCount} currently in</p>
          <p className="rounded-md bg-secondary px-3 py-2 text-sm">{totalCheckIns} total check-ins</p>
          <p className="rounded-md bg-secondary px-3 py-2 text-sm">{checkedOutCount} checked out</p>
        </div>
      </header>

      {isActiveDateToday ? (
        <div className="w-full max-w-2xl">
          <CustomerSearchCombobox
            label="Scan barcode, member ID, phone, email, or search name"
            placeholder="Scan barcode, member ID, phone, email, or search name"
            query={query}
            onQueryChange={setQuery}
            customers={results}
            onSelect={handleSelect}
            onAddCustomer={() => setShowAddCustomer(true)}
            autoFocus
            emptyMessage="No customers found. Add a new customer to continue."
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Historical check-in logs are read-only.</p>
      )}

      {feedback ? <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{feedback}</div> : null}
      {warning ? (
        <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p>{warning}</p>
          {showSwitchPrompt ? (
            <div className="mt-2">
              <StaffSwitcher label="Switch Staff" title="Switch Staff PIN" />
            </div>
          ) : null}
          {warning.includes("no valid access method") && sellCustomerId ? (
            <div className="mt-2">
              <Button variant="outline" onClick={() => setSellCustomerId(sellCustomerId)}>Sell Access</Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {todayLogRecords.length === 0 ? (
        <EmptyState title="No check-ins for this day" description="The daily log is empty for this date." />
      ) : (
        <div className="space-y-2">
          {todayLogRecords.map((record) => (
            <CheckInRow
              key={record.id}
              record={record}
              readOnly={!isActiveDateToday}
              onCheckOut={handleCheckOut}
            />
          ))}
        </div>
      )}
      {sellCustomer ? (
        <SellAccessModal
          open
          onClose={() => setSellCustomerId(null)}
          customer={sellCustomer}
          products={accessProducts}
          canUsePOS={hasPermission("usePOS")}
          canOverrideAccess={hasPermission("overrideAccess")}
          onSubmit={({ productIds, checkInAfterSale }) => {
            if (!activeStaff) {
              requestStaffSwitch("Staff PIN Required");
              return { ok: false, message: "Select staff PIN to continue.", transaction: null };
            }
            const result = sellAccessProducts({
              customerId: sellCustomer.id,
              productIds,
              soldByStaffId: activeStaff.id,
              soldByStaffName: `${activeStaff.firstName} ${activeStaff.lastName}`,
              checkInAfterSale
            });
            if (result.ok) {
              setFeedback(result.message);
              setWarning("");
              setShowSwitchPrompt(false);
            } else {
              setWarning(result.message);
            }
            return { ...result, transaction: result.transaction ?? null };
          }}
        />
      ) : null}
      {showAddCustomer ? (
        <AddCustomerModal
          open
          onClose={() => setShowAddCustomer(false)}
          onCreate={(input) => {
            const result = addCustomer(input);
            if (result.ok && result.customerId) {
              setQuery(`${input.firstName} ${input.lastName}`);
              setFeedback(result.message);
              setWarning("");
            }
            return result;
          }}
          title="Add Customer"
        />
      ) : null}
    </section>
  );
}
