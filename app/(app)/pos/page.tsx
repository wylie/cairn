"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PosProduct } from "@/types/domain";
import Link from "next/link";
import { AccessProductPicker } from "@/components/pos/access-product-picker";
import { CheckoutModal } from "@/components/pos/checkout-modal";
import { CustomerAccessSummary } from "@/components/pos/customer-access-summary";
import { AddCustomerModal } from "@/components/customers/add-customer-modal";
import { CustomerSearchCombobox } from "@/components/shared/customer-search-combobox";
import { MockReceiptPanel } from "@/components/pos/mock-receipt-panel";
import { ProductPriceLabel } from "@/components/pos/product-price-label";
import { PostSaleCheckInPanel } from "@/components/pos/post-sale-checkin-panel";
import { QuickButtonLayoutModal } from "@/components/products/quick-button-layout-modal";
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
    updateCustomerWaiver,
    householdMembers
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
  const [showQuickButtonsModal, setShowQuickButtonsModal] = useState(false);
  const [purchaseTarget, setPurchaseTarget] = useState<"self" | "member" | "household">("self");
  const [purchaseMemberId, setPurchaseMemberId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash" | "comp" | "account_balance">("card");
  const [emailReceipt, setEmailReceipt] = useState(true);
  const [printReceipt, setPrintReceipt] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [guestCheckout, setGuestCheckout] = useState(false);
  const [discountMode, setDiscountMode] = useState<"none" | "staff_10" | "manual">("none");
  const [manualDiscountCents, setManualDiscountCents] = useState(0);
  const [promoCode, setPromoCode] = useState("");
  const [quickProducts, setQuickProducts] = useState<PosProduct[]>([]);
  const customerSearchInputRef = useRef<HTMLInputElement>(null);

  const selectedCustomer = useMemo(
    () => customers.find((entry) => entry.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId]
  );

  const posEligibleCustomers = useMemo(
    () => customers.filter((entry) => !entry.staffProfile?.isStaff),
    [customers]
  );

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    return filterCustomers(posEligibleCustomers, query).slice(0, 8);
  }, [posEligibleCustomers, query]);

  const cartProducts = useMemo(
    () =>
      cart
        .map((productId) => accessProducts.find((product) => product.id === productId))
        .filter((product): product is PosProduct => Boolean(product)),
    [accessProducts, cart]
  );
  const subtotal = cartProducts.reduce((sum, product) => sum + product.priceCents, 0);
  const groupedCartItems = useMemo(() => {
    const map = new Map<string, { product: PosProduct; quantity: number }>();
    for (const product of cartProducts) {
      const current = map.get(product.id);
      if (current) current.quantity += 1;
      else map.set(product.id, { product, quantity: 1 });
    }
    return Array.from(map.values());
  }, [cartProducts]);
  const computedDiscountCents = useMemo(() => {
    if (discountMode === "staff_10") return Math.round(subtotal * 0.1);
    if (discountMode === "manual") return Math.max(0, Math.min(subtotal, manualDiscountCents));
    if (promoCode.trim().toUpperCase() === "REC10") return Math.round(subtotal * 0.1);
    return 0;
  }, [discountMode, manualDiscountCents, promoCode, subtotal]);
  const taxableSubtotal = Math.max(0, subtotal - computedDiscountCents);
  const taxCents = Math.round(taxableSubtotal * 0.07);
  const totalOwedCents = Math.max(0, taxableSubtotal + taxCents);
  const canUsePos = hasPermission("usePOS");
  const hasSelectedCustomer = Boolean(selectedCustomer) || guestCheckout;
  const hasCartItems = cartProducts.length > 0;
  const hasActiveStaff = Boolean(activeStaff);
  const canCheckout = canUsePos && hasSelectedCustomer && hasCartItems && hasActiveStaff;
  const canUseDiscounts = hasPermission("discountTransaction");
  const canCustomizeQuickButtons = activeStaff?.role === "owner" || activeStaff?.role === "manager";
  const selectedMembership = selectedCustomer
    ? householdMembers.find((entry) => entry.customerId === selectedCustomer.id)
    : undefined;
  const canPurchaseForHousehold = Boolean(selectedMembership?.canPurchaseForOthers);
  const householdPurchaseMembers = selectedMembership
    ? householdMembers
        .filter((entry) => entry.householdId === selectedMembership.householdId)
        .map((entry) => customers.find((customer) => customer.id === entry.customerId))
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    : [];

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

  const ensureCheckoutCustomer = () => {
    if (selectedCustomer) return { ok: true as const, customerId: selectedCustomer.id };
    if (!guestCheckout) return { ok: false as const, message: "Select a customer or continue as guest." };
    const guestName = `Guest ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    const created = addCustomer({
      firstName: guestName,
      lastName: "Walk-in",
      preferredName: guestName,
      pronouns: "Prefer not to say",
      dateOfBirth: "1990-01-01",
      phone: "(000) 000-0000",
      addressLine1: "Guest Checkout",
      city: "Unknown",
      state: "NY",
      postalCode: "00000",
      emergencyContactName: "Guest Checkout",
      emergencyContactPhone: "(000) 000-0000",
      email: "",
      notes: "Created from anonymous guest checkout."
    });
    if (!created.ok || !created.customerId) return { ok: false as const, message: "Unable to create guest checkout profile." };
    setSelectedCustomerId(created.customerId);
    return { ok: true as const, customerId: created.customerId };
  };

  const submit = (checkInAfterSale: boolean) => {
    const checkoutCustomer = ensureCheckoutCustomer();
    if (!checkoutCustomer.ok) {
      setWarning(checkoutCustomer.message);
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
      customerId: checkoutCustomer.customerId,
      purchaseForCustomerIds:
        purchaseTarget === "household"
          ? householdPurchaseMembers.map((entry) => entry.id)
          : purchaseTarget === "member" && purchaseMemberId
            ? [purchaseMemberId]
            : [checkoutCustomer.customerId],
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
    setCheckoutModalOpen(false);
    if (guestCheckout) setGuestCheckout(false);
  };

  const activeFulfillmentTransaction = useMemo(
    () => (activeFulfillmentTransactionId ? (transactions.find((entry) => entry.id === activeFulfillmentTransactionId) ?? receipt) : null),
    [activeFulfillmentTransactionId, receipt, transactions]
  );
  const shouldShowSwitchStaff = /staff pin|permission/i.test(warning);
  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget = Boolean(
        target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.tagName === "SELECT" ||
            target.isContentEditable)
      );
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        customerSearchInputRef.current?.focus();
        return;
      }
      if (event.key === "Enter" && checkoutModalOpen && canCheckout) {
        event.preventDefault();
        submit(false);
        return;
      }
      if (event.key === "Escape" && checkoutModalOpen) {
        event.preventDefault();
        setCheckoutModalOpen(false);
        return;
      }
      if (!event.metaKey && !event.ctrlKey && !event.altKey && !isTypingTarget) {
        const quickIndex = Number(event.key);
        if (Number.isFinite(quickIndex) && quickIndex >= 1 && quickIndex <= 9) {
          const product = quickProducts[quickIndex - 1];
          if (product) {
            event.preventDefault();
            setCart((prev) => [...prev, product.id]);
          }
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canCheckout, checkoutModalOpen, quickProducts]);

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

        <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr_1fr]">
          <div className="space-y-4 rounded-xl border bg-card p-4">
            <h3 className="text-lg font-semibold">Customer</h3>
            <CustomerSearchCombobox
              label="Search customer"
              placeholder="Search by name, member ID, phone, or email"
              query={query}
              onQueryChange={setQuery}
              inputRef={customerSearchInputRef}
              customers={searchResults}
              onSelect={(customerId) => {
                setSelectedCustomerId(customerId);
                setGuestCheckout(false);
                setQuery("");
              }}
              onAddCustomer={() => setShowAddCustomer(true)}
              emptyMessage="No customers found. Add a new customer to continue."
            />

            {selectedCustomer ? (
              <div className="space-y-3">
                <CustomerAccessSummary
                  customer={selectedCustomer}
                  membership={membership}
                  punchPass={punchPass}
                  waiverStatus={waiver?.status ?? "missing"}
                />
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <p><span className="text-muted-foreground">Pronouns:</span> {selectedCustomer.pronouns || "Not set"}</p>
                  <p><span className="text-muted-foreground">DOB/Age:</span> {selectedCustomer.dateOfBirth || "Not set"}</p>
                  <p><span className="text-muted-foreground">Phone:</span> {selectedCustomer.phone || "Not set"}</p>
                  <p><span className="text-muted-foreground">Emergency:</span> {selectedCustomer.emergencyContactName || "Not set"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/customers/${selectedCustomer.id}`} className="inline-flex min-h-11 items-center rounded-md border px-3 text-sm">
                    View Profile
                  </Link>
                  <Link href="/check-in" className="inline-flex min-h-11 items-center rounded-md border px-3 text-sm">
                    Check In
                  </Link>
                  <Button variant="secondary" className="min-h-11" onClick={() => customerSearchInputRef.current?.focus()}>
                    Sell Access
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 rounded-lg border border-dashed p-3">
                <p className="text-sm font-medium">Guest Checkout</p>
                <p className="text-sm text-muted-foreground">Search customer or continue with anonymous checkout.</p>
                <Button
                  type="button"
                  variant={guestCheckout ? "primary" : "secondary"}
                  className="min-h-11"
                  onClick={() => setGuestCheckout((prev) => !prev)}
                >
                  {guestCheckout ? "Guest selected" : "Continue as Guest"}
                </Button>
              </div>
            )}

            {selectedCustomer?.checkInStatus === "in" ? (
              <p className="text-sm text-amber-800">Customer is already checked in.</p>
            ) : null}
            {selectedCustomer && canPurchaseForHousehold ? (
              <div className="space-y-1 rounded-lg border border-dashed p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Purchasing for</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant={purchaseTarget === "self" ? "primary" : "secondary"} className="h-9" onClick={() => setPurchaseTarget("self")}>
                    {selectedCustomer.firstName}
                  </Button>
                  <Button type="button" variant={purchaseTarget === "member" ? "primary" : "secondary"} className="h-9" onClick={() => setPurchaseTarget("member")}>
                    Household Member
                  </Button>
                  <Button type="button" variant={purchaseTarget === "household" ? "primary" : "secondary"} className="h-9" onClick={() => setPurchaseTarget("household")}>
                    Entire Household
                  </Button>
                </div>
                {purchaseTarget === "member" ? (
                  <select
                    aria-label="Purchase for household member"
                    className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm"
                    value={purchaseMemberId}
                    onChange={(event) => setPurchaseMemberId(event.target.value)}
                  >
                    <option value="">Select household member</option>
                    {householdPurchaseMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.firstName} {member.lastName}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            ) : null}
            {waiver && waiver.status !== "valid" ? (
              <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <p>⚠ Waiver missing or expired</p>
                <Button
                  variant="secondary"
                  className="min-h-11"
                  onClick={() => {
                    if (!selectedCustomer || !activeStaff) return;
                    const result = updateCustomerWaiver(selectedCustomer.id, {
                      status: "valid",
                      signedAt: new Date().toISOString(),
                      expiresAt: "2027-05-20",
                      signedByStaffId: activeStaff.id,
                      updatedByStaffId: activeStaff.id,
                      updatedByStaffName: `${activeStaff.firstName} ${activeStaff.lastName}`
                    });
                    if (result.ok) {
                      setWarning("");
                      setFeedback("Waiver marked valid.");
                    } else {
                      setWarning(result.message);
                    }
                  }}
                >
                  Mark Signed
                </Button>
              </div>
            ) : null}
          </div>

          <div className="space-y-4 rounded-xl border bg-card p-4">
            <h3 className="text-lg font-semibold">Access Products</h3>
            {canCustomizeQuickButtons ? (
              <div className="flex justify-end">
                <Button type="button" variant="secondary" className="min-h-11" onClick={() => setShowQuickButtonsModal(true)}>
                  Customize Quick Buttons
                </Button>
              </div>
            ) : null}
            <AccessProductPicker
              products={accessProducts}
              disableStaffComp={!hasPermission("overrideAccess")}
              onQuickProductsChange={setQuickProducts}
              onAdd={(productId) => {
                const product = accessProducts.find((entry) => entry.id === productId);
                if (!product) return;
                if (
                  product.type === "membership" &&
                  (cartProducts.some((entry) => entry.type === "membership") || membership?.status === "active")
                ) {
                  setWarning("Duplicate membership warning: customer already has an active or pending membership in cart.");
                  return;
                }
                setCart((prev) => [...prev, productId]);
                setWarning("");
              }}
            />
          </div>

          <aside className="space-y-4 rounded-xl border bg-card p-4">
            <h3 className="text-lg font-semibold">Cart & Payment</h3>
            <div className="rounded-lg border p-3">
              {groupedCartItems.length === 0 ? <p className="text-sm text-muted-foreground">No products in cart.</p> : null}
              <div className="space-y-2">
                {groupedCartItems.map(({ product, quantity }) => (
                  <div key={product.id} className="rounded-md border bg-secondary/30 p-2 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.type}{product.waiverRequired ? " • Waiver required" : ""}</p>
                      </div>
                      <ProductPriceLabel cents={product.priceCents * quantity} />
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        variant="secondary"
                        className="h-9 px-3"
                        onClick={() => {
                          let removed = false;
                          setCart((prev) =>
                            prev.filter((entry) => {
                              if (!removed && entry === product.id) {
                                removed = true;
                                return false;
                              }
                              return true;
                            })
                          );
                        }}
                      >
                        -
                      </Button>
                      <span aria-label={`Quantity ${product.name}`}>Qty {quantity}</span>
                      <Button variant="secondary" className="h-9 px-3" onClick={() => setCart((prev) => [...prev, product.id])}>+</Button>
                      <Button variant="secondary" className="ml-auto h-9" onClick={() => setCart((prev) => prev.filter((entry) => entry !== product.id))}>Remove</Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-2 border-t pt-3 text-sm">
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Subtotal</span><ProductPriceLabel cents={subtotal} /></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Discounts</span><span>-{formatCurrency(computedDiscountCents)}</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Taxes</span><span>{formatCurrency(taxCents)}</span></div>
                <div className="flex items-center justify-between font-semibold"><span>Amount Owed</span><span>{formatCurrency(totalOwedCents)}</span></div>
              </div>
              <div className="mt-3 space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    aria-label="Discount mode"
                    value={discountMode}
                    onChange={(event) => setDiscountMode(event.target.value as typeof discountMode)}
                    className="h-11 rounded-md border border-input bg-white px-3 text-sm"
                    disabled={!canUseDiscounts}
                  >
                    <option value="none">No discount</option>
                    <option value="staff_10">Staff discount (10%)</option>
                    <option value="manual">Manual discount</option>
                  </select>
                  <input
                    aria-label="Promo code"
                    value={promoCode}
                    onChange={(event) => setPromoCode(event.target.value)}
                    placeholder="Promo code (placeholder)"
                    className="h-11 rounded-md border border-input bg-white px-3 text-sm"
                    disabled={!canUseDiscounts}
                  />
                </div>
                {discountMode === "manual" ? (
                  <input
                    aria-label="Manual discount amount"
                    value={manualDiscountCents === 0 ? "" : (manualDiscountCents / 100).toString()}
                    onChange={(event) => {
                      const parsed = Number(event.target.value);
                      setManualDiscountCents(Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100)) : 0);
                    }}
                    placeholder="Manual discount amount"
                    className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm"
                    disabled={!canUseDiscounts}
                  />
                ) : null}
              </div>
              <div className="mt-3 grid gap-2">
                <Button className="min-h-11" disabled={!canCheckout} onClick={() => setCheckoutModalOpen(true)}>
                  Checkout
                </Button>
                <Button className="min-h-11" disabled={!canCheckout} onClick={() => submit(true)}>Charge + Check In</Button>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Button variant="secondary" className="min-h-11" onClick={() => setCart([])}>Clear</Button>
                  <Button variant="secondary" className="min-h-11" disabled={!canCheckout} onClick={() => submit(false)}>Complete</Button>
                  <Button variant="secondary" className="min-h-11 whitespace-normal text-center" disabled={!canCheckout} onClick={() => submit(true)}>Complete + Check In</Button>
                </div>
              </div>
              {requiresWaiverInCart && waiverInvalid ? (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  This product requires a waiver. Customer cannot be checked in until waiver requirements are met.
                </div>
              ) : null}
              {!hasSelectedCustomer ? (
                <p className="mt-2 text-sm text-muted-foreground">Select a customer or continue as guest to complete sale.</p>
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
          </aside>
        </div>

        {feedback ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{feedback}</p> : null}
        {warning ? (
          <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <p>{warning}</p>
            {shouldShowSwitchStaff ? <div className="mt-2"><StaffSwitcher label="Switch Staff" title="Switch Staff PIN" /></div> : null}
          </div>
        ) : null}
        <MockReceiptPanel transaction={receipt ?? null} />
        {receipt ? (
          <div className="rounded-lg border bg-card p-3">
            <p className="font-medium text-emerald-800">✓ Purchase complete</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button variant="secondary" className="min-h-11" onClick={() => setFulfillmentOpen(true)} disabled={!activeFulfillmentTransaction || (activeFulfillmentTransaction.checkInSlots?.length ?? 0) === 0}>
                Check In
              </Button>
              <Button variant="secondary" className="min-h-11">Email Receipt</Button>
              <Button variant="secondary" className="min-h-11">Print Receipt</Button>
              <Button variant="secondary" className="min-h-11" onClick={() => { setReceipt(null); setFeedback(""); setWarning(""); }}>
                Start Another Sale
              </Button>
            </div>
          </div>
        ) : null}
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
        <CheckoutModal
          open={checkoutModalOpen}
          totalLabel={formatCurrency(totalOwedCents)}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          emailReceipt={emailReceipt}
          onEmailReceiptChange={setEmailReceipt}
          printReceipt={printReceipt}
          onPrintReceiptChange={setPrintReceipt}
          canComplete={canCheckout}
          helperText={
            !hasSelectedCustomer
              ? "Select a customer or continue as guest."
              : !hasCartItems
                ? "Add products to begin checkout."
                : !hasActiveStaff
                  ? "Select staff PIN to continue."
                  : undefined
          }
          onClose={() => setCheckoutModalOpen(false)}
          onComplete={() => submit(false)}
        />
        {showQuickButtonsModal ? <QuickButtonLayoutModal open onClose={() => setShowQuickButtonsModal(false)} /> : null}
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
