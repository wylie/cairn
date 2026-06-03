"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CustomerPortalContainer } from "@/components/portal/customer-portal-container";
import { usePublicCart } from "@/lib/public-cart";
import { useCustomerPortalData } from "@/lib/portal/use-customer-portal-data";
import { useCustomerState } from "@/lib/state/customer-state";
import { formatDateTime } from "@/lib/format/date";
import { getLocationName } from "@/lib/public-programs";
import { formatCurrency } from "@/lib/transactions";
import type { PosProduct, Program, ClassCampSession, Customer } from "@/types/domain";
import type { PaymentMethod } from "@/lib/payments/provider";

type DetailedCartItem = {
  id: string;
  kind: "session" | "product";
  participantCustomerId?: string;
  participant?: Customer;
  session?: ClassCampSession;
  program?: Program;
  product?: PosProduct;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  label: string;
  description: string;
  waitlistMode: boolean;
  waiverTemplateId?: string;
  eligibilityIssues: string[];
};

const STEP_LABELS = ["Participant", "Eligibility", "Waivers", "Payment", "Confirmation"] as const;

export function OnlineCheckout({ orgSlug }: { orgSlug: string }) {
  const router = useRouter();
  const { items, updateItem, removeItem, clearCart, promoCode, setPromoCode } = usePublicCart();
  const portal = useCustomerPortalData();
  const state = useCustomerState();
  const [step, setStep] = useState(0);
  const [authMode, setAuthMode] = useState<"login" | "create">("login");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [splitCashCents, setSplitCashCents] = useState(0);
  const [splitCardCents, setSplitCardCents] = useState(0);
  const [emailReceipt, setEmailReceipt] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmation, setConfirmation] = useState<{ receiptNumber?: string; transactionId?: string; waitlistedCount: number } | null>(null);
  const [authForm, setAuthForm] = useState({
    email: "maya.patel@example.com",
    password: "dev1234",
    firstName: "",
    lastName: "",
    phone: "",
    dateOfBirth: "1992-08-19",
    addressLine1: "123 Summit Ave",
    city: "New York",
    state: "NY",
    postalCode: "10011",
    emergencyContactName: "Taylor Nguyen",
    emergencyContactPhone: "(212) 555-0198"
  });

  const detailedItems = useMemo<DetailedCartItem[]>(() => {
    return items.map((item) => {
      const participant = item.participantCustomerId ? portal.customers.find((entry) => entry.id === item.participantCustomerId) : undefined;
      if (item.kind === "session") {
        const session = portal.sessions.find((entry) => entry.id === item.sessionId);
        const program = portal.programs.find((entry) => entry.id === session?.programId);
        const activeMembership = participant
          ? portal.customerAccessRecords.some(
              (entry) =>
                entry.customerId === participant.id &&
                entry.type === "membership" &&
                entry.status === "active" &&
                (!entry.expirationDate || entry.expirationDate >= (session?.startsAt ?? "").slice(0, 10))
            )
          : false;
        const pricingProduct = portal.accessProducts.find((entry) => {
          if (!program) return false;
          if (program.category === "camp" && (entry.category === "camps" || entry.type === "camp")) return true;
          if (
            (program.category === "class" || program.category === "clinic" || program.category === "course") &&
            (entry.category === "classes" || entry.type === "class" || entry.type === "registration")
          ) {
            return true;
          }
          return false;
        });
        const full = Boolean(session && session.enrolled >= session.capacity);
        const unitPriceCents = full
          ? 0
          : activeMembership
            ? pricingProduct?.memberPriceCents ?? pricingProduct?.priceCents ?? program?.basePriceCents ?? 0
            : pricingProduct?.nonMemberPriceCents ?? pricingProduct?.priceCents ?? program?.basePriceCents ?? 0;
        const issues = buildEligibilityIssues({ participant, session, program, portal });
        return {
          id: item.id,
          kind: item.kind,
          participantCustomerId: item.participantCustomerId,
          participant,
          session,
          program,
          quantity: 1,
          unitPriceCents,
          lineTotalCents: unitPriceCents,
          label: program?.title ?? "Program session",
          description: session ? `${formatDateTime(session.startsAt)} · ${getLocationName(session.locationId)}` : "Session unavailable",
          waitlistMode: full,
          waiverTemplateId: program?.requiredWaiverTemplateIds?.[0] ?? (program?.requiresWaiver ? "wtpl_general" : undefined),
          eligibilityIssues: issues
        };
      }
      const product = portal.accessProducts.find((entry) => entry.id === item.productId);
      const activeMembership = participant
        ? portal.customerAccessRecords.some(
            (entry) =>
              entry.customerId === participant.id &&
              entry.type === "membership" &&
              entry.status === "active" &&
              (!entry.expirationDate || entry.expirationDate >= portal.activeDateKey)
          )
        : false;
      const unitPriceCents = activeMembership ? product?.memberPriceCents ?? product?.priceCents ?? 0 : product?.nonMemberPriceCents ?? product?.priceCents ?? 0;
      const issues = buildProductEligibilityIssues({ participant, product, portal });
      return {
        id: item.id,
        kind: item.kind,
        participantCustomerId: item.participantCustomerId,
        participant,
        product,
        quantity: item.quantity,
        unitPriceCents,
        lineTotalCents: unitPriceCents * item.quantity,
        label: product?.name ?? "Product",
        description: product?.description ?? "",
        waitlistMode: false,
        waiverTemplateId: product?.waiverRequired ? "wtpl_general" : undefined,
        eligibilityIssues: issues
      };
    });
  }, [items, portal, orgSlug]);

  useEffect(() => {
    if (portal.visibleCustomers.length === 1) {
      const onlyId = portal.visibleCustomers[0]?.id;
      items.forEach((item) => {
        if (!item.participantCustomerId && onlyId) updateItem(item.id, { participantCustomerId: onlyId });
      });
    }
  }, [items, portal.visibleCustomers, updateItem]);

  const subtotalCents = detailedItems.reduce((sum, item) => sum + item.lineTotalCents, 0);
  const discountCents = useMemo(() => {
    if (!promoCode) return 0;
    if (promoCode === "WELCOME10") return Math.round(subtotalCents * 0.1);
    if (promoCode === "FAMILY5") {
      const participantCount = new Set(detailedItems.map((item) => item.participantCustomerId).filter(Boolean)).size;
      return participantCount >= 2 ? 500 : 0;
    }
    return 0;
  }, [detailedItems, promoCode, subtotalCents]);
  const taxableSubtotalCents = detailedItems.reduce((sum, item) => sum + (item.product?.taxable ? item.lineTotalCents : 0), 0);
  const taxCents = Math.round(taxableSubtotalCents * 0.07);
  const totalCents = Math.max(subtotalCents - discountCents + taxCents, 0);
  const splitTotalCents = splitCashCents + splitCardCents;
  const splitValid = paymentMethod !== "split" || splitTotalCents === totalCents;
  const eligibleParticipants = portal.visibleCustomers;
  const hasMissingParticipants = detailedItems.some((item) => !item.participantCustomerId);
  const hasEligibilityIssues = detailedItems.some((item) => item.eligibilityIssues.length > 0);
  const waiverActions = detailedItems.filter((item) => item.waiverTemplateId).filter((item) => {
    const participantId = item.participantCustomerId;
    if (!participantId || !item.waiverTemplateId) return false;
    const status = portal.getWaiverStatusForCustomer(participantId, item.waiverTemplateId);
    return !(status === "valid" || status === "expiring_soon");
  });
  const canAdvanceToEligibility = items.length > 0 && Boolean(portal.session?.customerId || portal.primaryCustomerId || portal.visibleCustomers.length > 0);
  const canAdvanceToWaivers = !hasMissingParticipants && !hasEligibilityIssues;
  const canAdvanceToPayment = waiverActions.length === 0;
  const canComplete = !hasMissingParticipants && !hasEligibilityIssues && waiverActions.length === 0 && splitValid && (totalCents === 0 || paymentMethod !== undefined);

  const ensureAuthenticatedCustomer = async () => {
    if (portal.primaryCustomerId) return true;
    setPending(true);
    setErrorMessage(null);
    try {
      if (authMode === "login") {
        const response = await fetch("/api/auth/customer-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: authForm.email, password: authForm.password })
        });
        const payload = await response.json();
        if (!response.ok || !payload.ok) {
          setErrorMessage(payload.message ?? "Unable to sign in.");
          return false;
        }
      } else {
        const existingCustomer = portal.customers.find((entry) => entry.email?.trim().toLowerCase() === authForm.email.trim().toLowerCase());
        const customerResult = existingCustomer
          ? { ok: true as const, customerId: existingCustomer.id }
          : state.addCustomer({
              firstName: authForm.firstName,
              lastName: authForm.lastName,
              email: authForm.email,
              phone: authForm.phone,
              dateOfBirth: authForm.dateOfBirth,
              addressLine1: authForm.addressLine1,
              city: authForm.city,
              state: authForm.state,
              postalCode: authForm.postalCode,
              emergencyContactName: authForm.emergencyContactName,
              emergencyContactPhone: authForm.emergencyContactPhone,
              waiverStatus: "missing"
            });
        if (!customerResult.ok || !customerResult.customerId) {
          setErrorMessage("message" in customerResult ? customerResult.message : "Unable to create your customer profile.");
          return false;
        }
        const response = await fetch("/api/auth/customer-register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: authForm.email,
            password: authForm.password,
            customerId: customerResult.customerId,
            organizationSlug: orgSlug
          })
        });
        const payload = await response.json();
        if (!response.ok || !payload.ok) {
          setErrorMessage(payload.message ?? "Unable to create account.");
          return false;
        }
      }
      router.refresh();
      setStatusMessage(authMode === "login" ? "Signed in for checkout." : "Account created. Continue assigning participants.");
      return true;
    } catch {
      setErrorMessage("Unable to continue with checkout.");
      return false;
    } finally {
      setPending(false);
    }
  };

  const completeCheckout = async () => {
    setPending(true);
    setErrorMessage(null);
    const purchaserId = portal.primaryCustomerId ?? portal.visibleCustomers[0]?.id;
    if (!purchaserId) {
      setErrorMessage("Sign in before completing checkout.");
      setPending(false);
      return;
    }
    const result = state.completePublicCheckout({
      purchaserCustomerId: purchaserId,
      items: detailedItems.map((item) =>
        item.kind === "session"
          ? { kind: "session" as const, sessionId: item.session!.id, participantCustomerId: item.participantCustomerId! }
          : { kind: "product" as const, productId: item.product!.id, participantCustomerId: item.participantCustomerId!, quantity: item.quantity }
      ),
      paymentType: paymentMethod,
      splitBreakdown:
        paymentMethod === "split"
          ? [
              { method: "cash" as const, amountCents: splitCashCents },
              { method: "card" as const, amountCents: splitCardCents }
            ].filter((entry) => entry.amountCents > 0)
          : undefined,
      promoCode,
      emailReceipt
    });
    if (!result.ok) {
      setErrorMessage(result.message);
      setPending(false);
      return;
    }
    setConfirmation({ receiptNumber: result.receiptNumber, transactionId: result.transactionId, waitlistedCount: result.waitlistedIds?.length ?? 0 });
    clearCart();
    setStatusMessage(result.message);
    setStep(4);
    setPending(false);
  };

  const sections = [
    {
      title: "Cart",
      body: (
        <div className="space-y-3">
          {detailedItems.length === 0 ? <p className="text-sm text-muted-foreground">Your cart is empty.</p> : null}
          {detailedItems.map((item) => (
            <div key={item.id} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                  {item.waitlistMode ? <Badge tone="warning" className="mt-2">Waitlist only</Badge> : null}
                </div>
                <div className="text-right text-sm font-medium">{formatCurrency(item.lineTotalCents / 100)}</div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="text-xs text-muted-foreground">Participant</label>
                <select
                  aria-label={`Participant for ${item.label}`}
                  className="h-10 rounded-md border border-input bg-white px-3 text-sm"
                  value={item.participantCustomerId ?? ""}
                  onChange={(event) => updateItem(item.id, { participantCustomerId: event.target.value || undefined })}
                >
                  <option value="">Select participant</option>
                  {eligibleParticipants.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.firstName} {customer.lastName}
                    </option>
                  ))}
                </select>
                {item.kind === "product" ? (
                  <input
                    aria-label={`Quantity for ${item.label}`}
                    type="number"
                    min="1"
                    value={item.quantity}
                    className="h-10 w-20 rounded-md border border-input bg-white px-3 text-sm"
                    onChange={(event) => updateItem(item.id, { quantity: Math.max(1, Number(event.target.value) || 1) })}
                  />
                ) : null}
                <Button variant="secondary" className="h-10" onClick={() => removeItem(item.id)}>Remove</Button>
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Link href={`/p/${orgSlug}/programs`} className="inline-flex min-h-10 items-center rounded-md border px-3 text-sm hover:bg-secondary">Browse Programs</Link>
            <Link href={`/p/${orgSlug}/store`} className="inline-flex min-h-10 items-center rounded-md border px-3 text-sm hover:bg-secondary">Shop Memberships & Retail</Link>
          </div>
        </div>
      )
    },
    {
      title: "Sign in or create account",
      body: portal.primaryCustomerId ? (
        <div className="rounded-lg border bg-secondary/20 p-3 text-sm">Signed in as {portal.primaryCustomer?.firstName} {portal.primaryCustomer?.lastName}. You can register household members you manage.</div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button variant={authMode === "login" ? "default" : "secondary"} className="h-10" onClick={() => setAuthMode("login")}>Sign In</Button>
            <Button variant={authMode === "create" ? "default" : "secondary"} className="h-10" onClick={() => setAuthMode("create")}>Create Account</Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {authMode === "create" ? (
              <>
                <Field label="First name"><Input value={authForm.firstName} onChange={(event) => setAuthForm((prev) => ({ ...prev, firstName: event.target.value }))} /></Field>
                <Field label="Last name"><Input value={authForm.lastName} onChange={(event) => setAuthForm((prev) => ({ ...prev, lastName: event.target.value }))} /></Field>
                <Field label="Phone"><Input value={authForm.phone} onChange={(event) => setAuthForm((prev) => ({ ...prev, phone: event.target.value }))} /></Field>
                <Field label="Date of birth"><Input type="date" value={authForm.dateOfBirth} onChange={(event) => setAuthForm((prev) => ({ ...prev, dateOfBirth: event.target.value }))} /></Field>
                <Field label="Address" className="md:col-span-2"><Input value={authForm.addressLine1} onChange={(event) => setAuthForm((prev) => ({ ...prev, addressLine1: event.target.value }))} /></Field>
                <Field label="City"><Input value={authForm.city} onChange={(event) => setAuthForm((prev) => ({ ...prev, city: event.target.value }))} /></Field>
                <Field label="State"><Input value={authForm.state} onChange={(event) => setAuthForm((prev) => ({ ...prev, state: event.target.value }))} /></Field>
                <Field label="ZIP code"><Input value={authForm.postalCode} onChange={(event) => setAuthForm((prev) => ({ ...prev, postalCode: event.target.value }))} /></Field>
                <Field label="Emergency contact"><Input value={authForm.emergencyContactName} onChange={(event) => setAuthForm((prev) => ({ ...prev, emergencyContactName: event.target.value }))} /></Field>
                <Field label="Emergency contact phone"><Input value={authForm.emergencyContactPhone} onChange={(event) => setAuthForm((prev) => ({ ...prev, emergencyContactPhone: event.target.value }))} /></Field>
              </>
            ) : null}
            <Field label="Email" className={authMode === "login" ? "md:col-span-2" : undefined}><Input type="email" value={authForm.email} onChange={(event) => setAuthForm((prev) => ({ ...prev, email: event.target.value }))} /></Field>
            <Field label="Password" className={authMode === "login" ? "md:col-span-2" : undefined}><Input type="password" value={authForm.password} onChange={(event) => setAuthForm((prev) => ({ ...prev, password: event.target.value }))} /></Field>
          </div>
          <Button className="min-h-11" disabled={pending} onClick={ensureAuthenticatedCustomer}>{pending ? "Saving..." : authMode === "login" ? "Continue to participant selection" : "Create account and continue"}</Button>
        </div>
      )
    },
    {
      title: "Eligibility review",
      body: (
        <div className="space-y-3">
          {detailedItems.map((item) => (
            <div key={item.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.participant ? `${item.participant.firstName} ${item.participant.lastName}` : "Participant required"}</p>
                </div>
                <Badge tone={item.eligibilityIssues.length === 0 ? "success" : "warning"}>{item.eligibilityIssues.length === 0 ? "Eligible" : "Needs attention"}</Badge>
              </div>
              {item.eligibilityIssues.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
                  {item.eligibilityIssues.map((issue) => <li key={issue}>{issue}</li>)}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Ready for checkout.</p>
              )}
            </div>
          ))}
        </div>
      )
    },
    {
      title: "Waiver validation",
      body: (
        <div className="space-y-3">
          {waiverActions.length === 0 ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">All required waivers are current.</p> : null}
          {waiverActions.map((item) => (
            <div key={item.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-medium">{item.participant?.firstName} {item.participant?.lastName} needs a waiver before checkout.</p>
              <p className="mt-1">{item.label} requires a signed waiver.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/p/${orgSlug}/waivers/${item.waiverTemplateId}?customerId=${item.participantCustomerId}`}
                  className="inline-flex min-h-10 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
                >
                  Sign Waiver
                </Link>
              </div>
            </div>
          ))}
        </div>
      )
    },
    {
      title: "Payment",
      body: (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Promo code"><Input value={promoCode} onChange={(event) => setPromoCode(event.target.value)} placeholder="WELCOME10 or FAMILY5" /></Field>
            <Field label="Payment method">
              <select className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}>
                <option value="card">Card</option>
                <option value="cash">Cash</option>
                <option value="gift_card">Gift Card</option>
                <option value="account_credit">Account Credit</option>
                <option value="comp">Comp</option>
                <option value="split">Split Payment</option>
              </select>
            </Field>
            {paymentMethod === "split" ? (
              <>
                <Field label="Split cash amount"><Input aria-label="Split cash amount" type="number" min="0" step="0.01" value={splitCashCents ? (splitCashCents / 100).toFixed(2) : ""} onChange={(event) => setSplitCashCents(Math.max(0, Math.round(Number(event.target.value || 0) * 100)))} /></Field>
                <Field label="Split card amount"><Input aria-label="Split card amount" type="number" min="0" step="0.01" value={splitCardCents ? (splitCardCents / 100).toFixed(2) : ""} onChange={(event) => setSplitCardCents(Math.max(0, Math.round(Number(event.target.value || 0) * 100)))} /></Field>
              </>
            ) : null}
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={emailReceipt} onChange={(event) => setEmailReceipt(event.target.checked)} />
            Email confirmations and receipt
          </label>
          <div className="rounded-lg border p-4 text-sm">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(subtotalCents / 100)}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Discounts</span><span>-{formatCurrency(discountCents / 100)}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Taxes</span><span>{formatCurrency(taxCents / 100)}</span></div>
            <div className="mt-2 flex items-center justify-between text-base font-semibold"><span>Total</span><span>{formatCurrency(totalCents / 100)}</span></div>
            {paymentMethod === "split" && !splitValid ? <p className="mt-2 text-sm text-destructive">Split amounts must equal {formatCurrency(totalCents / 100)}.</p> : null}
          </div>
        </div>
      )
    },
    {
      title: "Confirmation",
      body: confirmation ? (
        <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          <p className="text-lg font-semibold">Checkout complete</p>
          <p>Receipt {confirmation.receiptNumber}</p>
          <p>{confirmation.waitlistedCount > 0 ? `${confirmation.waitlistedCount} registrations joined the waitlist.` : "All registrations were confirmed."}</p>
          <div className="flex flex-wrap gap-2">
            {confirmation.transactionId ? <Link href={`/p/${orgSlug}/purchases/${confirmation.transactionId}`} className="inline-flex min-h-10 items-center rounded-md border border-emerald-300 px-3 text-sm">View Receipt</Link> : null}
            <Link href={`/p/${orgSlug}/account/registrations`} className="inline-flex min-h-10 items-center rounded-md border border-emerald-300 px-3 text-sm">Upcoming Registrations</Link>
          </div>
        </div>
      ) : <p className="text-sm text-muted-foreground">Complete checkout to see your confirmation.</p>
    }
  ];

  return (
    <CustomerPortalContainer>
      <section className="space-y-4" data-testid="online-checkout-page">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
          <div>
            <h1 className="text-2xl font-semibold">Online Registration & Checkout</h1>
            <p className="text-sm text-muted-foreground">Register for programs, buy memberships and passes, add retail items, and complete payment in one flow.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            {STEP_LABELS.map((label, index) => (
              <button
                key={label}
                type="button"
                className={`rounded-full border px-3 py-1 ${index === step ? "border-primary bg-primary text-primary-foreground" : "bg-white text-muted-foreground"}`}
                onClick={() => setStep(index)}
              >
                {index + 1}. {label}
              </button>
            ))}
          </div>
        </div>

        {statusMessage ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{statusMessage}</p> : null}
        {errorMessage ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{errorMessage}</p> : null}

        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <Card>
            <CardHeader>
              <CardTitle>{sections[step]?.title}</CardTitle>
              <CardDescription>Complete this step to continue through checkout.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sections[step]?.body}
              <div className="flex flex-wrap justify-between gap-2 border-t pt-4">
                <Button variant="secondary" className="min-h-11" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}>Back</Button>
                {step === 0 ? <Button className="min-h-11" disabled={items.length === 0} onClick={() => setStep(1)}>Continue</Button> : null}
                {step === 1 ? <Button className="min-h-11" disabled={pending || Boolean(portal.primaryCustomerId)} onClick={ensureAuthenticatedCustomer}>{portal.primaryCustomerId ? "Signed in" : "Continue"}</Button> : null}
                {step === 2 ? <Button className="min-h-11" disabled={!canAdvanceToWaivers} onClick={() => setStep(3)}>Continue</Button> : null}
                {step === 3 ? <Button className="min-h-11" disabled={!canAdvanceToPayment} onClick={() => setStep(4)}>Continue</Button> : null}
                {step === 4 ? <Button className="min-h-11" disabled={pending || !canComplete} onClick={completeCheckout}>{pending ? "Processing..." : "Complete Checkout"}</Button> : null}
              </div>
            </CardContent>
          </Card>

          <aside className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
                <CardDescription>{detailedItems.length} items in cart</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {detailedItems.map((item) => (
                  <div key={item.id} className="rounded-md border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-muted-foreground">{item.description}</p>
                        {item.participant ? <p className="mt-1 text-xs text-muted-foreground">For {item.participant.firstName} {item.participant.lastName}</p> : null}
                      </div>
                      <span className="font-medium">{formatCurrency(item.lineTotalCents / 100)}</span>
                    </div>
                  </div>
                ))}
                <div className="rounded-md border bg-secondary/20 p-3">
                  <div className="flex items-center justify-between"><span>Subtotal</span><span>{formatCurrency(subtotalCents / 100)}</span></div>
                  <div className="flex items-center justify-between"><span>Discounts</span><span>-{formatCurrency(discountCents / 100)}</span></div>
                  <div className="flex items-center justify-between"><span>Tax</span><span>{formatCurrency(taxCents / 100)}</span></div>
                  <div className="mt-2 flex items-center justify-between font-semibold"><span>Total</span><span>{formatCurrency(totalCents / 100)}</span></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Next steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Programs: participant assignment, eligibility, and waitlist status are reviewed before payment.</p>
                <p>Memberships and passes activate immediately after successful checkout.</p>
                <p>Receipts and confirmation links appear in the customer portal after purchase.</p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </section>
    </CustomerPortalContainer>
  );
}

function buildEligibilityIssues({ participant, session, program, portal }: { participant?: Customer; session?: ClassCampSession; program?: Program; portal: ReturnType<typeof useCustomerPortalData> }) {
  const issues: string[] = [];
  if (!participant) {
    issues.push("Select a participant.");
    return issues;
  }
  if (!session || !program) {
    issues.push("Session is unavailable.");
    return issues;
  }
  const dob = participant.dateOfBirth ? new Date(`${participant.dateOfBirth}T00:00:00Z`) : null;
  const age = dob && !Number.isNaN(dob.getTime())
    ? Math.max(0, Math.floor((new Date(session.startsAt).getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.2425)))
    : undefined;
  if (typeof program.minimumAge === "number" && typeof age === "number" && age < program.minimumAge) issues.push(`Minimum age is ${program.minimumAge}.`);
  if (typeof program.maximumAge === "number" && typeof age === "number" && age > program.maximumAge) issues.push(`Maximum age is ${program.maximumAge}.`);
  if (program.memberRequired) {
    const hasMembership = portal.customerAccessRecords.some((entry) => entry.customerId === participant.id && entry.type === "membership" && entry.status === "active");
    if (!hasMembership) issues.push("Active membership required.");
  }
  const requiredTemplateIds = program.requiredWaiverTemplateIds ?? (program.requiresWaiver ? ["wtpl_general"] : []);
  if (requiredTemplateIds.length > 0) {
    const hasWaivers = requiredTemplateIds.every((templateId) => {
      const status = portal.getWaiverStatusForCustomer(participant.id, templateId);
      return status === "valid" || status === "expiring_soon";
    });
    if (!hasWaivers) issues.push("Required waiver is missing or expired.");
  }
  if (program.guardianRequired) {
    const membership = portal.householdMembers.find((entry) => entry.customerId === participant.id);
    const hasGuardian = Boolean(
      membership &&
        portal.householdMembers.some(
          (entry) =>
            entry.householdId === membership.householdId &&
            entry.customerId !== participant.id &&
            entry.memberType === "adult" &&
            (entry.relationship === "parent_guardian" || entry.role === "guardian" || entry.role === "primary-adult" || entry.role === "secondary-adult")
        )
    );
    if (!hasGuardian) issues.push("Guardian relationship required.");
  }
  if (session.enrolled >= session.capacity && !session.waitlistEnabled) issues.push("Session is full.");
  return issues;
}

function buildProductEligibilityIssues({ participant, product, portal }: { participant?: Customer; product?: PosProduct; portal: ReturnType<typeof useCustomerPortalData> }) {
  const issues: string[] = [];
  if (!participant) {
    issues.push("Select a participant.");
    return issues;
  }
  if (!product) {
    issues.push("Product unavailable.");
    return issues;
  }
  if (product.waiverRequired) {
    const status = portal.getWaiverStatusForCustomer(participant.id, "wtpl_general");
    if (!(status === "valid" || status === "expiring_soon")) issues.push("Valid waiver required.");
  }
  if (typeof product.minimumAge === "number" && participant.dateOfBirth) {
    const age = Math.max(
      0,
      Math.floor((new Date(`${portal.activeDateKey}T00:00:00Z`).getTime() - new Date(`${participant.dateOfBirth}T00:00:00Z`).getTime()) / (1000 * 60 * 60 * 24 * 365.2425))
    );
    if (age < product.minimumAge) issues.push(`Minimum age is ${product.minimumAge}.`);
  }
  if (product.trackInventory && (product.inventoryByLocation?.[portal.activeLocationId] ?? 0) <= 0) issues.push("Out of stock.");
  return issues;
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`space-y-1 ${className ?? ""}`}>
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
