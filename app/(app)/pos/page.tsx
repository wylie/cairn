"use client";

import { useMemo, useState } from "react";
import type { PosProduct } from "@/types/domain";
import Link from "next/link";
import { AccessProductPicker } from "@/components/pos/access-product-picker";
import { CustomerAccessSummary } from "@/components/pos/customer-access-summary";
import { AddCustomerModal } from "@/components/customers/add-customer-modal";
import { CustomerSearchCombobox } from "@/components/shared/customer-search-combobox";
import { MockReceiptPanel } from "@/components/pos/mock-receipt-panel";
import { ProductPriceLabel } from "@/components/pos/product-price-label";
import { PostSaleCheckInPanel } from "@/components/pos/post-sale-checkin-panel";
import { PermissionGate } from "@/components/staff/permission-gate";
import { StaffSwitcher } from "@/components/staff/staff-switcher";
import { Button } from "@/components/ui/button";
import { filterCustomers } from "@/lib/data/customer-search";
import { useCustomerState } from "@/lib/state/customer-state";
import { useWorkstationState } from "@/lib/state/workstation-state";

export default function PosPage() {
  const {
    customers,
    memberships,
    punchPasses,
    waivers,
    accessProducts,
    transactions,
    sellAccessProducts,
    assignSaleCheckInSlotCustomer,
    fulfillSaleCheckInSlot,
    addCustomer,
    updateCustomerWaiver
  } = useCustomerState();
  const { activeStaff, hasPermission, requestStaffSwitch } = useWorkstationState();

  const [query, setQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [cart, setCart] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const [warning, setWarning] = useState("");
  const [receipt, setReceipt] = useState<ReturnType<typeof sellAccessProducts>["transaction"] | null>(null);
  const [activeFulfillmentTransactionId, setActiveFulfillmentTransactionId] = useState<string | null>(null);
  const [fulfillmentOpen, setFulfillmentOpen] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  const selectedCustomer = useMemo(
    () => customers.find((entry) => entry.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId]
  );

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    return filterCustomers(customers, query).slice(0, 8);
  }, [customers, query]);

  const cartProducts = useMemo(
    () =>
      cart
        .map((productId) => accessProducts.find((product) => product.id === productId))
        .filter((product): product is PosProduct => Boolean(product)),
    [accessProducts, cart]
  );
  const subtotal = cartProducts.reduce((sum, product) => sum + product.priceCents, 0);
  const canUsePos = hasPermission("usePOS");
  const hasSelectedCustomer = Boolean(selectedCustomer);
  const hasCartItems = cartProducts.length > 0;
  const hasActiveStaff = Boolean(activeStaff);
  const canCheckout = canUsePos && hasSelectedCustomer && hasCartItems && hasActiveStaff;

  const membership = selectedCustomer?.membershipId
    ? memberships.find((entry) => entry.id === selectedCustomer.membershipId)
    : undefined;
  const punchPass = selectedCustomer?.punchPassId
    ? punchPasses.find((entry) => entry.id === selectedCustomer.punchPassId)
    : undefined;
  const waiver = selectedCustomer?.waiverId
    ? waivers.find((entry) => entry.id === selectedCustomer.waiverId)
    : undefined;
  const requiresWaiverInCart = cartProducts.some((product) => product.waiverRequired);
  const waiverInvalid = !!selectedCustomer && waiver?.status !== "valid";

  const submit = (checkInAfterSale: boolean) => {
    if (!selectedCustomer) {
      setWarning("Select a customer first.");
      setFeedback("");
      return;
    }
    if (!activeStaff) {
      setWarning("Select staff PIN to continue.");
      setFeedback("");
      requestStaffSwitch("Staff PIN Required");
      return;
    }
    if (waiver?.status !== "valid") {
      setWarning("Waiver missing or expired. Sale can continue, but check-in will remain blocked until waiver is valid.");
    }

    const result = sellAccessProducts({
      customerId: selectedCustomer.id,
      productIds: cart,
      soldByStaffId: activeStaff.id,
      soldByStaffName: `${activeStaff.firstName} ${activeStaff.lastName}`,
      checkInAfterSale
    });

    if (!result.ok) {
      setWarning(result.message);
      setFeedback("");
      return;
    }

    setWarning("");
    setFeedback(result.message);
    setReceipt(result.transaction ?? null);
    setActiveFulfillmentTransactionId(result.transaction?.id ?? null);
    if ((result.transaction?.checkInSlots?.length ?? 0) > 0) setFulfillmentOpen(true);
    setCart([]);
  };

  const activeFulfillmentTransaction = useMemo(
    () => (activeFulfillmentTransactionId ? (transactions.find((entry) => entry.id === activeFulfillmentTransactionId) ?? receipt) : null),
    [activeFulfillmentTransactionId, receipt, transactions]
  );
  const shouldShowSwitchStaff = /staff pin|permission/i.test(warning);

  const getWaiverStatusForCustomer = (customerId?: string) => {
    if (!customerId) return "missing";
    const customer = customers.find((entry) => entry.id === customerId);
    if (!customer?.waiverId) return "missing";
    return waivers.find((entry) => entry.id === customer.waiverId)?.status ?? "missing";
  };

  return (
    <PermissionGate permission="usePOS">
      <section className="space-y-4">
        <header>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-3xl font-semibold">Front Desk POS</h2>
            <Link href="/pos/history" className="text-sm text-muted-foreground underline">Sales History</Link>
          </div>
          <p className="text-sm text-muted-foreground">Sell access products quickly, then check guests in without leaving this screen.</p>
        </header>

        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.35fr]">
          <div className="space-y-4 rounded-xl border bg-card p-4">
            <h3 className="text-lg font-semibold">Customer</h3>
            <CustomerSearchCombobox
              label="Search customer"
              placeholder="Search by name, member ID, phone, or email"
              query={query}
              onQueryChange={setQuery}
              customers={searchResults}
              onSelect={(customerId) => {
                setSelectedCustomerId(customerId);
                setQuery("");
              }}
              onAddCustomer={() => setShowAddCustomer(true)}
              emptyMessage="No customers found. Add a new customer to continue."
            />

            {selectedCustomer ? (
              <CustomerAccessSummary
                customer={selectedCustomer}
                membership={membership}
                punchPass={punchPass}
                waiverStatus={waiver?.status ?? "missing"}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Select a customer to start a sale.</p>
            )}

            {selectedCustomer?.checkInStatus === "in" ? (
              <p className="text-sm text-amber-800">Customer is already checked in.</p>
            ) : null}
            {waiver && waiver.status !== "valid" ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-sm text-amber-800">Waiver missing or expired</p>
            ) : null}
          </div>

          <div className="space-y-4 rounded-xl border bg-card p-4">
            <h3 className="text-lg font-semibold">Access Products</h3>
            <AccessProductPicker
              products={accessProducts}
              disableStaffComp={!hasPermission("overrideAccess")}
              onAdd={(productId) => setCart((prev) => [...prev, productId])}
            />

            <div className="rounded-lg border p-3">
              <p className="font-medium">Cart</p>
              {cartProducts.length === 0 ? <p className="text-sm text-muted-foreground">No access products selected.</p> : null}
              <div className="mt-2 space-y-2">
                {cartProducts.map((item, index) => (
                  <div key={`${item.id}-${index}`} className="flex items-center justify-between text-sm">
                    <span>{item.name}{item.waiverRequired ? " • Waiver required" : ""}</span>
                    <div className="flex items-center gap-2">
                      <ProductPriceLabel cents={item.priceCents} />
                      <button className="text-xs text-muted-foreground" onClick={() => setCart((prev) => prev.filter((_, i) => i !== index))}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t pt-2">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <ProductPriceLabel cents={subtotal} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" className="min-h-11" onClick={() => setCart([])}>Clear</Button>
                <Button className="min-h-11" disabled={!canCheckout} onClick={() => submit(false)}>Complete</Button>
                <Button className="min-h-11 whitespace-normal text-center" disabled={!canCheckout} onClick={() => submit(true)}>Complete + Check In</Button>
              </div>
              {requiresWaiverInCart && waiverInvalid ? (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  This product requires a waiver. Customer cannot be checked in until waiver requirements are met.
                </div>
              ) : null}
              {!hasSelectedCustomer ? (
                <p className="mt-2 text-sm text-muted-foreground">Select a customer to complete sale.</p>
              ) : null}
              {!hasCartItems ? (
                <p className="mt-2 text-sm text-muted-foreground">Add at least one product to complete sale.</p>
              ) : null}
              {!hasActiveStaff ? (
                <p className="mt-2 text-sm text-muted-foreground">Select staff PIN to continue.</p>
              ) : null}
            </div>

            <div className="rounded-lg border bg-secondary/30 px-3 py-2 text-sm text-muted-foreground">
              Staff: {activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : "No staff selected"}
            </div>
          </div>
        </div>

        {feedback ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{feedback}</p> : null}
        {warning ? (
          <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <p>{warning}</p>
            {shouldShowSwitchStaff ? <div className="mt-2"><StaffSwitcher label="Switch Staff" title="Switch Staff PIN" /></div> : null}
          </div>
        ) : null}
        <MockReceiptPanel transaction={receipt ?? null} />
        {activeFulfillmentTransaction ? (
          <PostSaleCheckInPanel
            open={fulfillmentOpen}
            onClose={() => setFulfillmentOpen(false)}
            transaction={activeFulfillmentTransaction}
            customers={customers}
            getSlotCheckInState={(slotId) => {
              const slot = activeFulfillmentTransaction.checkInSlots?.find((entry) => entry.id === slotId);
              if (slot?.status === "checked-in") {
                return { canCheckIn: false, actionLabel: "Check In" as const, statusLabel: "Checked In" as const };
              }
              if (!slot?.assignedCustomerId) return { canCheckIn: false, actionLabel: "Check In" as const, statusLabel: "Available" as const };
              const waiverStatus = getWaiverStatusForCustomer(slot.assignedCustomerId);
              if (waiverStatus === "valid") return { canCheckIn: true, actionLabel: "Check In" as const, statusLabel: "Available" as const };
              const canOverride = hasPermission("overrideAccess");
              return canOverride
                ? {
                    canCheckIn: true,
                    actionLabel: "Manager Override + Check In" as const,
                    statusLabel: "Blocked" as const,
                    reason: "Missing or expired waiver",
                    blockedByWaiver: true
                  }
                : {
                    canCheckIn: false,
                    actionLabel: "Manager Required" as const,
                    statusLabel: "Blocked" as const,
                    reason: "Missing or expired waiver",
                    blockedByWaiver: true
                  };
            }}
            onAssignCustomer={(slotId, customerId) => {
              const result = assignSaleCheckInSlotCustomer(activeFulfillmentTransaction.id, slotId, customerId);
              if (!result.ok) setWarning(result.message);
              else setWarning("");
              return result;
            }}
            onCheckInSlot={(slotId) => {
              if (!activeStaff) {
                const result = { ok: false as const, message: "Select staff PIN to continue." };
                setWarning(result.message);
                requestStaffSwitch("Staff PIN Required");
                return result;
              }
              const result = fulfillSaleCheckInSlot(activeFulfillmentTransaction.id, slotId, {
                staffUserId: activeStaff.id,
                staffName: `${activeStaff.firstName} ${activeStaff.lastName}`,
                overrideReason: hasPermission("overrideAccess") ? "Waiver override from POS fulfillment" : undefined
              });
              if (!result.ok) setWarning(result.message);
              else {
                setWarning("");
                setFeedback(result.message);
              }
              return result;
            }}
            onDone={() => {
              setActiveFulfillmentTransactionId(null);
              setFulfillmentOpen(false);
            }}
            onAddCustomer={() => setShowAddCustomer(true)}
            onMarkWaiverSigned={(slotId) => {
              if (!activeStaff) {
                const result = { ok: false as const, message: "Select staff PIN to continue." };
                setWarning(result.message);
                requestStaffSwitch("Staff PIN Required");
                return result;
              }
              const slot = activeFulfillmentTransaction.checkInSlots?.find((entry) => entry.id === slotId);
              if (!slot?.assignedCustomerId) return { ok: false as const, message: "Create or select a customer to check in." };
              const result = updateCustomerWaiver(slot.assignedCustomerId, {
                status: "valid",
                signedAt: new Date().toISOString(),
                expiresAt: "2027-05-20",
                signedByStaffId: activeStaff.id,
                updatedByStaffId: activeStaff.id,
                updatedByStaffName: `${activeStaff.firstName} ${activeStaff.lastName}`
              });
              if (!result.ok) setWarning(result.message);
              else {
                setWarning("");
                setFeedback("Waiver marked valid. Check-in is now available.");
              }
              return result;
            }}
          />
        ) : null}
      </section>
      {showAddCustomer ? (
        <AddCustomerModal
          open
          onClose={() => setShowAddCustomer(false)}
          customers={customers}
          autoCloseOnSuccess
          onCreate={(input) => {
            const result = addCustomer({
              ...input,
              createdByStaffId: activeStaff?.id,
              createdByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : undefined
            });
            if (result.ok && result.customerId) {
              setSelectedCustomerId(result.customerId);
              setFeedback(result.message);
              setWarning("");
              setQuery("");
            }
            return result;
          }}
          onCreated={(customerId) => {
            setSelectedCustomerId(customerId);
            setFeedback("Customer created and selected.");
            setWarning("");
            setQuery("");
          }}
          title="New Customer"
        />
      ) : null}
    </PermissionGate>
  );
}
