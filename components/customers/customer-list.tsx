"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AddCustomerModal } from "@/components/customers/add-customer-modal";
import { CustomerCard } from "@/components/customers/customer-card";
import { SellAccessModal } from "@/components/pos/sell-access-modal";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/search-input";
import { StaffSwitcher } from "@/components/staff/staff-switcher";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { filterCustomers } from "@/lib/data/customer-search";
import { getMembershipForCustomer, getPassForCustomer, getWaiverForCustomer } from "@/lib/data/selectors";
import { buildCustomerDetailHref } from "@/lib/navigation/detail-navigation";
import { useCustomerState } from "@/lib/state/customer-state";
import { useWorkstationState } from "@/lib/state/workstation-state";
import type { Customer } from "@/types/domain";
import { createPersistedCustomerAction } from "@/app/(app)/customers/actions";

export function CustomerList({ persistedCustomers }: { persistedCustomers?: Customer[] }) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const currentSearch = searchParams?.toString?.() ?? "";
  const initialQuery = searchParams?.get("query") ?? "";
  const waiverFilter = searchParams?.get("waiver");
  const birthdayFilter = searchParams?.get("birthday");
  const { customers, households, householdMembers, accessProducts, runCustomerCheckInAction, sellAccessProducts, addCustomer, evaluateCustomerEntry } = useCustomerState();
  const { activeStaff, assertPermission, requestStaffSwitch, hasPermission } = useWorkstationState();
  const [query, setQuery] = useState(initialQuery);
  const [feedback, setFeedback] = useState("");
  const [warning, setWarning] = useState("");
  const [showSwitchPrompt, setShowSwitchPrompt] = useState(false);
  const [sellCustomerId, setSellCustomerId] = useState<string | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const usesPersistedCustomers = Array.isArray(persistedCustomers);
  const displayedCustomers = persistedCustomers ?? customers;
  const hasCustomerRecords = displayedCustomers.length > 0;

  const filtered = useMemo(
    () =>
      filterCustomers(displayedCustomers, query, { households, householdMembers }).filter((customer) => {
        if (waiverFilter === "missing") {
          const decision = evaluateCustomerEntry(customer.id);
          const hasWaiverIssue =
            decision.reasons.some((reason) => reason.toLowerCase().includes("waiver")) ||
            decision.warnings.some((warning) => warning.toLowerCase().includes("waiver"));
          if (!hasWaiverIssue) return false;
        }

        if (birthdayFilter === "today") {
          if (!customer.dateOfBirth) return false;
          const dob = new Date(`${customer.dateOfBirth}T00:00:00Z`);
          if (Number.isNaN(dob.getTime())) return false;
          const now = new Date();
          if (dob.getUTCMonth() !== now.getUTCMonth() || dob.getUTCDate() !== now.getUTCDate()) return false;
        }

        return true;
      }),
    [displayedCustomers, query, households, householdMembers, waiverFilter, birthdayFilter, evaluateCustomerEntry]
  );
  const sellCustomer = useMemo(() => customers.find((entry) => entry.id === sellCustomerId) ?? null, [customers, sellCustomerId]);

  const handleToggleCheckIn = (customerId: string) => {
    const customer = customers.find((entry) => entry.id === customerId);
    const permission = assertPermission(customer?.checkInStatus === "in" ? "checkOutCustomer" : "checkInCustomer");
    if (!permission.ok) {
      setWarning(permission.message);
      setFeedback("");
      setShowSwitchPrompt(true);
      requestStaffSwitch("Staff PIN Required");
      return;
    }

    const staffName = `${activeStaff!.firstName} ${activeStaff!.lastName}`;
    const result = runCustomerCheckInAction(customerId, {
      staffUserId: activeStaff!.id,
      staffName,
      source: "manual_search"
    });

    if (!result.ok) {
      setWarning(result.message);
      setFeedback("");
      setShowSwitchPrompt(true);
      return;
    }

    setFeedback(result.message);
    setWarning("");
    setShowSwitchPrompt(false);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full max-w-md">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search by name, email, phone, or member ID"
            label="Search customers"
          />
        </div>
        <Button className="min-h-11" variant="outline" onClick={() => setShowAddCustomer(true)}>Add Customer</Button>
        {waiverFilter === "missing" ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">Waiver Status: Missing</span> : null}
        {birthdayFilter === "today" ? <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-900">Birthday: Today</span> : null}
      </div>
      {feedback ? <Notice role="status" tone="success" className="px-4 py-3">{feedback}</Notice> : null}
      {warning ? (
        <Notice role="alert" tone="warning" className="px-4 py-3">
          <p>{warning}</p>
          {showSwitchPrompt ? (
            <div className="mt-2">
              <StaffSwitcher label="Switch Staff" title="Switch Staff PIN" />
            </div>
          ) : null}
        </Notice>
      ) : null}
      {filtered.length === 0 ? (
        <div className="space-y-2">
          <EmptyState
            title={hasCustomerRecords ? "No customers found" : "No customers have been added yet."}
            description={hasCustomerRecords ? "Try a different name, email, phone, or member ID, or add a walk-in customer to continue." : "Customer records will appear here once they are seeded or migrated into the database."}
          />
          <Button className="min-h-11" variant="outline" onClick={() => setShowAddCustomer(true)}>Add Customer</Button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((customer) => (
            (() => {
              const membership = usesPersistedCustomers ? undefined : getMembershipForCustomer(customer);
              const punchPass = usesPersistedCustomers ? undefined : getPassForCustomer(customer);
              const decision = usesPersistedCustomers ? null : evaluateCustomerEntry(customer.id);
              const canCheckIn = usesPersistedCustomers ? false : customer.checkInStatus === "in" || Boolean(decision?.allowed);
              const blockedReason = usesPersistedCustomers ? "Check-in still uses demo persistence and is not migrated yet." : canCheckIn ? undefined : decision?.reasons[0] ?? "No valid access method.";
              return (
            <CustomerCard
              key={customer.id}
              customer={customer}
              membership={membership}
              punchPass={punchPass}
              waiver={usesPersistedCustomers ? undefined : getWaiverForCustomer(customer)}
              householdHref={
                householdMembers.find((entry) => entry.customerId === customer.id)?.householdId
                  ? `/households/${householdMembers.find((entry) => entry.customerId === customer.id)?.householdId}`
                  : undefined
              }
              canCheckIn={canCheckIn}
              blockedReason={blockedReason}
              viewProfileHref={buildCustomerDetailHref({
                customerId: customer.id,
                currentPathname: pathname,
                currentSearch
              })}
              onToggleCheckIn={handleToggleCheckIn}
              onSellAccess={setSellCustomerId}
            />
              );
            })()
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
          customers={displayedCustomers}
          onCreate={async (input) => {
            if (usesPersistedCustomers) {
              const result = await createPersistedCustomerAction(input);
              if (result.ok) router.refresh();
              return result;
            }

            const result = addCustomer({
              ...input,
              createdByStaffId: activeStaff?.id,
              createdByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : undefined
            });
            if (result.ok) {
              setFeedback(result.message);
              setWarning("");
            }
            return result;
          }}
          onCreated={(_, input) => {
            setQuery(`${input.firstName} ${input.lastName}`.trim());
            setFeedback("Customer created.");
            setWarning("");
            setShowSwitchPrompt(false);
          }}
          quickActions={
            usesPersistedCustomers
              ? undefined
              : {
                  onSellAccess: (customerId) => setSellCustomerId(customerId),
                  onCheckIn: (customerId) => handleToggleCheckIn(customerId)
                }
          }
        />
      ) : null}
    </section>
  );
}
