"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
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

type PublicPaymentMethod = Exclude<PaymentMethod, "cash" | "comp">;

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

type ConfirmationState = {
  confirmationNumber?: string;
  receiptNumber?: string;
  transactionId?: string;
  registrationIds: string[];
  waitlistedIds: string[];
};

type ConfirmationRegistrationRow = {
  registration: { id: string; status: string; customerId: string; sessionId: string; waitlistPosition?: number | null };
  participant?: Customer;
  session?: ClassCampSession;
  program?: Program;
};

type AuthFormState = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
};

const STEPS = [
  "Select Program",
  "Select Participant",
  "Eligibility Check",
  "Waiver Validation",
  "Review Cart",
  "Checkout",
  "Confirmation"
] as const;

const PUBLIC_PAYMENT_OPTIONS: Array<{ value: PublicPaymentMethod; label: string; description: string }> = [
  { value: "card", label: "Card", description: "Placeholder online card payment." },
  { value: "gift_card", label: "Gift Card", description: "Apply stored gift card balance." },
  { value: "account_credit", label: "Account Credit", description: "Use available account credit." },
  { value: "split", label: "Split Payment", description: "Split between card and gift card or account credit." }
];

export function OnlineCheckout({ orgSlug, initialStep = 0 }: { orgSlug: string; initialStep?: number }) {
  const router = useRouter();
  const { items, updateItem, removeItem, clearCart, promoCode, setPromoCode } = usePublicCart();
  const portal = useCustomerPortalData();
  const state = useCustomerState();
  const [step, setStep] = useState(() => clampStep(initialStep));
  const [authMode, setAuthMode] = useState<"login" | "create">("login");
  const [paymentMethod, setPaymentMethod] = useState<PublicPaymentMethod>("card");
  const [splitGiftCents, setSplitGiftCents] = useState(0);
  const [splitCardCents, setSplitCardCents] = useState(0);
  const [emailReceipt, setEmailReceipt] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);
  const [authForm, setAuthForm] = useState<AuthFormState>({
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

  useEffect(() => {
    setStep(clampStep(initialStep));
  }, [initialStep]);

  useEffect(() => {
    if (paymentMethod !== "split") {
      setSplitGiftCents(0);
      setSplitCardCents(0);
    }
  }, [paymentMethod]);

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
        const waitlistMode = Boolean(session && session.enrolled >= session.capacity);
        const unitPriceCents = waitlistMode
          ? 0
          : activeMembership
            ? pricingProduct?.memberPriceCents ?? pricingProduct?.priceCents ?? program?.basePriceCents ?? 0
            : pricingProduct?.nonMemberPriceCents ?? pricingProduct?.priceCents ?? program?.basePriceCents ?? 0;
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
          waitlistMode,
          waiverTemplateId: program?.requiredWaiverTemplateIds?.[0] ?? (program?.requiresWaiver ? "wtpl_general" : undefined),
          eligibilityIssues: buildEligibilityIssues({ participant, session, program, portal })
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
      const unitPriceCents = activeMembership
        ? product?.memberPriceCents ?? product?.priceCents ?? 0
        : product?.nonMemberPriceCents ?? product?.priceCents ?? 0;
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
        eligibilityIssues: buildProductEligibilityIssues({ participant, product, portal })
      };
    });
  }, [items, portal]);

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
  const splitValid = paymentMethod !== "split" || splitGiftCents + splitCardCents === totalCents;
  const eligibleParticipants = portal.visibleCustomers;
  const hasMissingParticipants = detailedItems.some((item) => !item.participantCustomerId);
  const hasEligibilityIssues = detailedItems.some((item) => item.eligibilityIssues.length > 0);
  const waiverActions = detailedItems.filter((item) => item.waiverTemplateId).filter((item) => {
    const participantId = item.participantCustomerId;
    if (!participantId || !item.waiverTemplateId) return false;
    const status = portal.getWaiverStatusForCustomer(participantId, item.waiverTemplateId);
    return !(status === "valid" || status === "expiring_soon");
  });
  const canMoveToEligibility = portal.primaryCustomerId ? !hasMissingParticipants : false;
  const canMoveToWaivers = !hasMissingParticipants && !hasEligibilityIssues;
  const canMoveToReview = waiverActions.length === 0;
  const canComplete = !hasMissingParticipants && !hasEligibilityIssues && waiverActions.length === 0 && splitValid;

  const confirmationRegistrations = useMemo(() => {
    if (!confirmation) return [] as ConfirmationRegistrationRow[];
    return confirmation.registrationIds
      .map((registrationId) => {
        const registration = portal.registrations.find((entry) => entry.id === registrationId);
        if (!registration) return null;
        const participant = portal.customers.find((entry) => entry.id === registration.customerId);
        const session = portal.sessions.find((entry) => entry.id === registration.sessionId);
        const program = portal.programs.find((entry) => entry.id === session?.programId);
        return { registration, participant, session, program } as ConfirmationRegistrationRow;
      })
      .filter((entry): entry is ConfirmationRegistrationRow => entry !== null);
  }, [confirmation, portal.customers, portal.programs, portal.registrations, portal.sessions]);

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
      setStatusMessage(authMode === "login" ? "Signed in for registration." : "Account created. Continue with participant selection.");
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
      authorizedParticipantIds: portal.visibleCustomerIds,
      items: detailedItems.map((item) =>
        item.kind === "session"
          ? { kind: "session" as const, sessionId: item.session!.id, participantCustomerId: item.participantCustomerId! }
          : { kind: "product" as const, productId: item.product!.id, participantCustomerId: item.participantCustomerId!, quantity: item.quantity }
      ),
      paymentType: paymentMethod,
      splitBreakdown:
        paymentMethod === "split"
          ? [
              { method: "gift_card" as const, amountCents: splitGiftCents },
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

    setConfirmation({
      confirmationNumber: result.confirmationNumber,
      receiptNumber: result.receiptNumber,
      transactionId: result.transactionId,
      registrationIds: result.registrationIds ?? [],
      waitlistedIds: result.waitlistedIds ?? []
    });
    clearCart();
    setStatusMessage(result.message);
    setStep(6);
    setPending(false);
  };

  const handleContinue = async () => {
    if (step === 0) {
      if (items.length > 0) setStep(1);
      return;
    }
    if (step === 1) {
      if (!portal.primaryCustomerId) {
        const ok = await ensureAuthenticatedCustomer();
        if (!ok) return;
      }
      if (!canMoveToEligibility) {
        setErrorMessage("Select a participant for every item before continuing.");
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!canMoveToWaivers) {
        setErrorMessage("Resolve the eligibility issues before continuing.");
        return;
      }
      setStep(3);
      return;
    }
    if (step === 3) {
      if (!canMoveToReview) {
        setErrorMessage("Complete the required waivers before continuing.");
        return;
      }
      setStep(4);
      return;
    }
    if (step === 4) {
      setStep(5);
      return;
    }
    if (step === 5) {
      if (!canComplete) {
        setErrorMessage("Review the payment details before completing checkout.");
        return;
      }
      await completeCheckout();
    }
  };

  return (
    <CustomerPortalContainer>
      <section className="space-y-4" data-testid="online-checkout-page">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">Online Registration & Checkout</h1>
              <p className="text-sm text-muted-foreground">
                Register household members, review eligibility, validate waivers, and complete checkout without staff assistance.
              </p>
            </div>
            <div className="rounded-lg border bg-secondary/30 px-3 py-2 text-sm text-muted-foreground">
              {items.length} {items.length === 1 ? "item" : "items"} in cart
            </div>
          </div>
          <div className="mt-4 grid gap-2 lg:grid-cols-7">
            {STEPS.map((label, index) => {
              const active = index === step;
              const complete = index < step || (index === 6 && Boolean(confirmation));
              return (
                <button
                  key={label}
                  type="button"
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition ${active ? "border-primary bg-primary text-primary-foreground" : complete ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "bg-white text-muted-foreground hover:bg-secondary/50"}`}
                  onClick={() => {
                    if (index === 6 && !confirmation) return;
                    setStep(clampStep(index));
                  }}
                >
                  <div className="text-xs font-medium uppercase tracking-wide opacity-80">Step {index + 1}</div>
                  <div className="mt-1 font-medium">{label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {statusMessage ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{statusMessage}</p> : null}
        {errorMessage ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{errorMessage}</p> : null}

        <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
          <Card>
            <CardHeader>
              <CardTitle>{STEPS[step]}</CardTitle>
              <CardDescription>{getStepDescription(step)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {step === 0 ? (
                <SelectProgramStep detailedItems={detailedItems} eligibleParticipants={eligibleParticipants} orgSlug={orgSlug} removeItem={removeItem} updateItem={updateItem} />
              ) : null}
              {step === 1 ? (
                <SelectParticipantStep
                  authForm={authForm}
                  authMode={authMode}
                  detailedItems={detailedItems}
                  eligibleParticipants={eligibleParticipants}
                  hasMissingParticipants={hasMissingParticipants}
                  householdCountLabel={`${eligibleParticipants.length} ${eligibleParticipants.length === 1 ? "person" : "people"}`}
                  onAuthFormChange={setAuthForm}
                  onAuthModeChange={setAuthMode}
                  portal={portal}
                  updateItem={updateItem}
                />
              ) : null}
              {step === 2 ? <EligibilityStep detailedItems={detailedItems} /> : null}
              {step === 3 ? <WaiverValidationStep detailedItems={waiverActions} orgSlug={orgSlug} /> : null}
              {step === 4 ? <ReviewCartStep detailedItems={detailedItems} discountCents={discountCents} subtotalCents={subtotalCents} taxCents={taxCents} totalCents={totalCents} /> : null}
              {step === 5 ? (
                <CheckoutStep
                  discountCents={discountCents}
                  emailReceipt={emailReceipt}
                  paymentMethod={paymentMethod}
                  promoCode={promoCode}
                  splitCardCents={splitCardCents}
                  splitGiftCents={splitGiftCents}
                  splitValid={splitValid}
                  subtotalCents={subtotalCents}
                  taxCents={taxCents}
                  totalCents={totalCents}
                  onEmailReceiptChange={setEmailReceipt}
                  onPaymentMethodChange={setPaymentMethod}
                  onPromoCodeChange={setPromoCode}
                  onSplitCardChange={setSplitCardCents}
                  onSplitGiftChange={setSplitGiftCents}
                  primaryCustomer={portal.primaryCustomer}
                />
              ) : null}
              {step === 6 ? <ConfirmationStep confirmation={confirmation} confirmationRegistrations={confirmationRegistrations} orgSlug={orgSlug} /> : null}

              <div className="flex flex-wrap justify-between gap-2 border-t pt-4">
                <Button variant="secondary" className="min-h-11" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}>
                  Back
                </Button>
                {step < 6 ? (
                  <Button className="min-h-11" disabled={pending || (step === 0 && items.length === 0)} onClick={handleContinue}>
                    {pending && step >= 1 ? "Working..." : step === 5 ? "Complete Checkout" : "Continue"}
                  </Button>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/p/${orgSlug}/registrations`} className="inline-flex min-h-11 items-center rounded-md border px-3 text-sm hover:bg-secondary/40">
                      View Registration History
                    </Link>
                    <Link href={`/p/${orgSlug}/programs`} className="inline-flex min-h-11 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">
                      Browse More Programs
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <aside className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cart Summary</CardTitle>
                <CardDescription>Mixed cart support for programs, memberships, passes, and retail.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {detailedItems.length === 0 ? <p className="text-muted-foreground">Your cart is empty.</p> : null}
                {detailedItems.map((item) => (
                  <div key={item.id} className="rounded-md border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-muted-foreground">{item.description}</p>
                        {item.participant ? <p className="mt-1 text-xs text-muted-foreground">Participant: {item.participant.firstName} {item.participant.lastName}</p> : null}
                      </div>
                      <span className="font-medium">{formatCurrency(item.lineTotalCents / 100)}</span>
                    </div>
                    {item.waitlistMode ? <Badge tone="warning" className="mt-2">Waitlist only</Badge> : null}
                  </div>
                ))}
                <div className="rounded-md border bg-secondary/20 p-3">
                  <div className="flex items-center justify-between"><span>Subtotal</span><span>{formatCurrency(subtotalCents / 100)}</span></div>
                  <div className="flex items-center justify-between"><span>Discounts</span><span>-{formatCurrency(discountCents / 100)}</span></div>
                  <div className="flex items-center justify-between"><span>Taxes</span><span>{formatCurrency(taxCents / 100)}</span></div>
                  <div className="mt-2 flex items-center justify-between font-semibold"><span>Total</span><span>{formatCurrency(totalCents / 100)}</span></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Operational Rules</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Participant selection is limited to the authenticated customer and household members they manage.</p>
                <p>Waivers must be current before payment can complete. Returning from the waiver flow brings you back here.</p>
                <p>Cash and comp remain staff-only tender types. This public checkout exposes customer-safe payment methods only.</p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </section>
    </CustomerPortalContainer>
  );
}

function SelectProgramStep({
  detailedItems,
  eligibleParticipants,
  orgSlug,
  removeItem,
  updateItem
}: {
  detailedItems: DetailedCartItem[];
  eligibleParticipants: Customer[];
  orgSlug: string;
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: { participantCustomerId?: string; quantity?: number }) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-secondary/20 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Choose what you want to buy or register for.</p>
        <p className="mt-1">Programs, memberships, day passes, and retail items all stay in one mixed cart for a single checkout.</p>
      </div>
      {detailedItems.length === 0 ? <p className="text-sm text-muted-foreground">Your cart is empty.</p> : null}
      {detailedItems.map((item) => (
        <div key={item.id} className="rounded-lg border p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{item.label}</p>
                {item.waitlistMode ? <Badge tone="warning">Join waitlist</Badge> : null}
              </div>
              <p className="text-sm text-muted-foreground">{item.description}</p>
              <p className="text-sm text-muted-foreground">{item.kind === "session" ? "Program registration" : "Product purchase"}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Line total</p>
              <p className="text-lg font-semibold">{formatCurrency(item.lineTotalCents / 100)}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Field label="Participant">
              <select
                aria-label={`Participant for ${item.label}`}
                className="h-11 min-w-56 rounded-md border border-input bg-white px-3 text-sm"
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
            </Field>
            {item.kind === "product" ? (
              <Field label="Quantity">
                <Input
                  aria-label={`Quantity for ${item.label}`}
                  type="number"
                  min="1"
                  value={item.quantity}
                  className="w-24"
                  onChange={(event) => updateItem(item.id, { quantity: Math.max(1, Number(event.target.value) || 1) })}
                />
              </Field>
            ) : null}
            <Button variant="secondary" className="min-h-11" onClick={() => removeItem(item.id)}>
              Remove
            </Button>
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Link href={`/p/${orgSlug}/programs`} className="inline-flex min-h-11 items-center rounded-md border px-3 text-sm hover:bg-secondary/40">
          Browse Programs
        </Link>
        <Link href={`/p/${orgSlug}/store`} className="inline-flex min-h-11 items-center rounded-md border px-3 text-sm hover:bg-secondary/40">
          Shop Memberships & Passes
        </Link>
      </div>
    </div>
  );
}

function SelectParticipantStep({
  authForm,
  authMode,
  detailedItems,
  eligibleParticipants,
  hasMissingParticipants,
  householdCountLabel,
  onAuthFormChange,
  onAuthModeChange,
  portal,
  updateItem
}: {
  authForm: AuthFormState;
  authMode: "login" | "create";
  detailedItems: DetailedCartItem[];
  eligibleParticipants: Customer[];
  hasMissingParticipants: boolean;
  householdCountLabel: string;
  onAuthFormChange: Dispatch<SetStateAction<AuthFormState>>;
  onAuthModeChange: (mode: "login" | "create") => void;
  portal: ReturnType<typeof useCustomerPortalData>;
  updateItem: (id: string, updates: { participantCustomerId?: string; quantity?: number }) => void;
}) {
  return (
    <div className="space-y-4">
      {!portal.primaryCustomerId ? (
        <div className="space-y-4 rounded-lg border bg-secondary/20 p-4">
          <div className="flex flex-wrap gap-2">
            <Button variant={authMode === "login" ? "default" : "secondary"} className="min-h-11" onClick={() => onAuthModeChange("login")}>
              Sign In
            </Button>
            <Button variant={authMode === "create" ? "default" : "secondary"} className="min-h-11" onClick={() => onAuthModeChange("create")}>
              Create Account
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {authMode === "create" ? (
              <>
                <Field label="First name"><Input value={authForm.firstName} onChange={(event) => onAuthFormChange((prev) => ({ ...prev, firstName: event.target.value }))} /></Field>
                <Field label="Last name"><Input value={authForm.lastName} onChange={(event) => onAuthFormChange((prev) => ({ ...prev, lastName: event.target.value }))} /></Field>
                <Field label="Phone"><Input value={authForm.phone} onChange={(event) => onAuthFormChange((prev) => ({ ...prev, phone: event.target.value }))} /></Field>
                <Field label="Date of birth"><Input type="date" value={authForm.dateOfBirth} onChange={(event) => onAuthFormChange((prev) => ({ ...prev, dateOfBirth: event.target.value }))} /></Field>
                <Field label="Address" className="md:col-span-2"><Input value={authForm.addressLine1} onChange={(event) => onAuthFormChange((prev) => ({ ...prev, addressLine1: event.target.value }))} /></Field>
                <Field label="City"><Input value={authForm.city} onChange={(event) => onAuthFormChange((prev) => ({ ...prev, city: event.target.value }))} /></Field>
                <Field label="State"><Input value={authForm.state} onChange={(event) => onAuthFormChange((prev) => ({ ...prev, state: event.target.value }))} /></Field>
                <Field label="ZIP code"><Input value={authForm.postalCode} onChange={(event) => onAuthFormChange((prev) => ({ ...prev, postalCode: event.target.value }))} /></Field>
                <Field label="Emergency contact"><Input value={authForm.emergencyContactName} onChange={(event) => onAuthFormChange((prev) => ({ ...prev, emergencyContactName: event.target.value }))} /></Field>
                <Field label="Emergency contact phone"><Input value={authForm.emergencyContactPhone} onChange={(event) => onAuthFormChange((prev) => ({ ...prev, emergencyContactPhone: event.target.value }))} /></Field>
              </>
            ) : null}
            <Field label="Email" className={authMode === "login" ? "md:col-span-2" : undefined}><Input type="email" value={authForm.email} onChange={(event) => onAuthFormChange((prev) => ({ ...prev, email: event.target.value }))} /></Field>
            <Field label="Password" className={authMode === "login" ? "md:col-span-2" : undefined}><Input type="password" value={authForm.password} onChange={(event) => onAuthFormChange((prev) => ({ ...prev, password: event.target.value }))} /></Field>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-secondary/20 p-4 text-sm text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{portal.primaryCustomer?.firstName} {portal.primaryCustomer?.lastName}</span>. Only household members you manage can be selected below.
        </div>
      )}

      <div className="rounded-lg border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">My Household</h3>
            <p className="text-sm text-muted-foreground">Select self, children, dependents, or other managed household members. Unauthorized people never appear here.</p>
          </div>
          <Badge tone="muted">{householdCountLabel}</Badge>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {eligibleParticipants.map((customer) => {
            const householdMembership = portal.householdMembers.find((entry) => entry.customerId === customer.id);
            const waiverStatus = portal.getWaiverStatusForCustomer(customer.id, "wtpl_general");
            const age = getCustomerAge(customer);
            return (
              <div key={customer.id} className="rounded-lg border bg-white p-3 text-sm">
                <p className="font-medium">{customer.firstName} {customer.lastName}</p>
                <p className="text-muted-foreground">{householdMembership?.role?.replaceAll("-", " ") ?? "Household member"}{typeof age === "number" ? ` · Age ${age}` : ""}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {portal.customerAccessRecords.some((entry) => entry.customerId === customer.id && entry.type === "membership" && entry.status === "active") ? <Badge tone="muted">Membership active</Badge> : null}
                  {waiverStatus === "valid" || waiverStatus === "expiring_soon" ? <Badge tone="muted">Waiver current</Badge> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        {detailedItems.map((item) => (
          <div key={item.id} className="rounded-lg border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{item.label}</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
              <Badge tone={item.participant ? "success" : "warning"}>{item.participant ? `${item.participant.firstName} ${item.participant.lastName}` : "Participant required"}</Badge>
            </div>
            <Field label="Participant" className="mt-4">
              <select
                aria-label={`Participant for ${item.label}`}
                className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm"
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
            </Field>
          </div>
        ))}
      </div>

      {hasMissingParticipants ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Select a participant for every cart item before continuing.
        </p>
      ) : null}
    </div>
  );
}

function EligibilityStep({ detailedItems }: { detailedItems: DetailedCartItem[] }) {
  return (
    <div className="space-y-3">
      {detailedItems.map((item) => (
        <div key={item.id} className="rounded-lg border p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">{item.label}</p>
              <p className="text-sm text-muted-foreground">{item.participant ? `${item.participant.firstName} ${item.participant.lastName}` : "Participant required"}</p>
            </div>
            <Badge tone={item.eligibilityIssues.length === 0 ? "success" : "warning"}>{item.eligibilityIssues.length === 0 ? "Eligible" : "Needs review"}</Badge>
          </div>
          {item.eligibilityIssues.length > 0 ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-900">
              {item.eligibilityIssues.map((issue) => <li key={issue}>{issue}</li>)}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Eligibility passed. This participant can continue to waiver review.</p>
          )}
        </div>
      ))}
    </div>
  );
}

function WaiverValidationStep({ detailedItems, orgSlug }: { detailedItems: DetailedCartItem[]; orgSlug: string }) {
  if (detailedItems.length === 0) {
    return <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">All required waivers are current.</p>;
  }
  return (
    <div className="space-y-3">
      {detailedItems.map((item) => (
        <div key={item.id} className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">{item.participant?.firstName} {item.participant?.lastName} needs a waiver before checkout.</p>
          <p className="mt-1">{item.label} requires a current waiver, including the latest version where applicable.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={buildWaiverHref(orgSlug, item.waiverTemplateId!, item.participantCustomerId!)} className="inline-flex min-h-11 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">
              Sign Waiver
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReviewCartStep({
  detailedItems,
  discountCents,
  subtotalCents,
  taxCents,
  totalCents
}: {
  detailedItems: DetailedCartItem[];
  discountCents: number;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
}) {
  return (
    <div className="space-y-4">
      {detailedItems.map((item) => (
        <div key={item.id} className="rounded-lg border p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{item.label}</p>
                {item.waitlistMode ? <Badge tone="warning">Waitlist eligible</Badge> : null}
              </div>
              <p className="text-sm text-muted-foreground">{item.description}</p>
              <p className="text-sm text-muted-foreground">Participant: {item.participant ? `${item.participant.firstName} ${item.participant.lastName}` : "Not selected"}</p>
              {item.waitlistMode ? <p className="text-sm text-muted-foreground">Estimated availability depends on cancellations and manual promotions.</p> : null}
            </div>
            <p className="text-lg font-semibold">{formatCurrency(item.lineTotalCents / 100)}</p>
          </div>
        </div>
      ))}
      <div className="rounded-lg border bg-secondary/20 p-4 text-sm">
        <div className="flex items-center justify-between"><span>Subtotal</span><span>{formatCurrency(subtotalCents / 100)}</span></div>
        <div className="flex items-center justify-between"><span>Discounts</span><span>-{formatCurrency(discountCents / 100)}</span></div>
        <div className="flex items-center justify-between"><span>Taxes</span><span>{formatCurrency(taxCents / 100)}</span></div>
        <div className="mt-2 flex items-center justify-between text-base font-semibold"><span>Total</span><span>{formatCurrency(totalCents / 100)}</span></div>
      </div>
    </div>
  );
}

function CheckoutStep({
  discountCents,
  emailReceipt,
  paymentMethod,
  promoCode,
  splitCardCents,
  splitGiftCents,
  splitValid,
  subtotalCents,
  taxCents,
  totalCents,
  onEmailReceiptChange,
  onPaymentMethodChange,
  onPromoCodeChange,
  onSplitCardChange,
  onSplitGiftChange,
  primaryCustomer
}: {
  discountCents: number;
  emailReceipt: boolean;
  paymentMethod: PublicPaymentMethod;
  promoCode: string;
  splitCardCents: number;
  splitGiftCents: number;
  splitValid: boolean;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  onEmailReceiptChange: (value: boolean) => void;
  onPaymentMethodChange: (value: PublicPaymentMethod) => void;
  onPromoCodeChange: (value: string) => void;
  onSplitCardChange: (value: number) => void;
  onSplitGiftChange: (value: number) => void;
  primaryCustomer?: Customer;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Billing contact">
          <div className="flex min-h-11 items-center rounded-md border border-input bg-secondary/20 px-3 text-sm">
            {primaryCustomer ? `${primaryCustomer.firstName} ${primaryCustomer.lastName} · ${primaryCustomer.email ?? "No email"}` : "Sign in required"}
          </div>
        </Field>
        <Field label="Promo code">
          <Input value={promoCode} onChange={(event) => onPromoCodeChange(event.target.value.toUpperCase())} placeholder="WELCOME10 or FAMILY5" />
        </Field>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Payment method</p>
        <div className="grid gap-3 md:grid-cols-2">
          {PUBLIC_PAYMENT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`rounded-lg border p-3 text-left ${paymentMethod === option.value ? "border-primary bg-primary/5" : "bg-white hover:bg-secondary/40"}`}
              onClick={() => onPaymentMethodChange(option.value)}
            >
              <p className="font-medium">{option.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{option.description}</p>
            </button>
          ))}
        </div>
        {paymentMethod === "split" ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Gift card / account credit amount">
              <Input
                aria-label="Split gift card amount"
                type="number"
                min="0"
                step="0.01"
                value={splitGiftCents ? (splitGiftCents / 100).toFixed(2) : ""}
                onChange={(event) => onSplitGiftChange(Math.max(0, Math.round(Number(event.target.value || 0) * 100)))}
              />
            </Field>
            <Field label="Card amount">
              <Input
                aria-label="Split card amount"
                type="number"
                min="0"
                step="0.01"
                value={splitCardCents ? (splitCardCents / 100).toFixed(2) : ""}
                onChange={(event) => onSplitCardChange(Math.max(0, Math.round(Number(event.target.value || 0) * 100)))}
              />
            </Field>
          </div>
        ) : null}
      </div>

      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" checked={emailReceipt} onChange={(event) => onEmailReceiptChange(event.target.checked)} />
        Email confirmations and receipt
      </label>

      <div className="rounded-lg border p-4 text-sm">
        <div className="flex items-center justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(subtotalCents / 100)}</span></div>
        <div className="flex items-center justify-between"><span className="text-muted-foreground">Discounts</span><span>-{formatCurrency(discountCents / 100)}</span></div>
        <div className="flex items-center justify-between"><span className="text-muted-foreground">Taxes</span><span>{formatCurrency(taxCents / 100)}</span></div>
        <div className="mt-2 flex items-center justify-between text-base font-semibold"><span>Total</span><span>{formatCurrency(totalCents / 100)}</span></div>
        {!splitValid ? <p className="mt-2 text-sm text-destructive">Split amounts must equal {formatCurrency(totalCents / 100)}.</p> : null}
      </div>
    </div>
  );
}

function ConfirmationStep({
  confirmation,
  confirmationRegistrations,
  orgSlug
}: {
  confirmation: ConfirmationState | null;
  confirmationRegistrations: ConfirmationRegistrationRow[];
  orgSlug: string;
}) {
  if (!confirmation) {
    return <p className="text-sm text-muted-foreground">Complete checkout to see your confirmation.</p>;
  }

  return (
    <div className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
      <div>
        <p className="text-lg font-semibold">Registration confirmed</p>
        <p className="text-sm">Confirmation number: {confirmation.confirmationNumber}</p>
        {confirmation.receiptNumber ? <p className="text-sm">Receipt: {confirmation.receiptNumber}</p> : null}
      </div>

      <div className="space-y-3">
        {confirmationRegistrations.map((entry) => (
          <div key={entry.registration.id} className="rounded-md border border-emerald-200 bg-white p-3 text-sm text-foreground">
            <p className="font-medium">{entry.program?.title ?? entry.session?.title ?? "Registration"}</p>
            <p className="text-muted-foreground">{entry.participant ? `${entry.participant.firstName} ${entry.participant.lastName}` : "Participant not recorded"}</p>
            <p className="text-muted-foreground">{entry.session ? `${formatDateTime(entry.session.startsAt)} · ${getLocationName(entry.session.locationId)}` : "Schedule unavailable"}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {entry.registration.status === "waitlisted" ? `Waitlist position ${entry.registration.waitlistPosition ?? "TBD"}` : entry.registration.status}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/p/${orgSlug}/registrations/${entry.registration.id}`} className="inline-flex min-h-10 items-center rounded-md border px-3 text-sm hover:bg-secondary/40">
                View Registration
              </Link>
              <Button variant="secondary" className="min-h-10">Add To Calendar (Soon)</Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {confirmation.transactionId ? (
          <Link href={`/p/${orgSlug}/purchases/${confirmation.transactionId}`} className="inline-flex min-h-11 items-center rounded-md border border-emerald-300 bg-white px-3 text-sm hover:bg-emerald-100">
            View Receipt
          </Link>
        ) : null}
        <Link href={`/p/${orgSlug}/registrations`} className="inline-flex min-h-11 items-center rounded-md border border-emerald-300 bg-white px-3 text-sm hover:bg-emerald-100">
          View Registration History
        </Link>
      </div>
    </div>
  );
}

function buildEligibilityIssues({ participant, session, program, portal }: { participant?: Customer; session?: ClassCampSession; program?: Program; portal: ReturnType<typeof useCustomerPortalData> }) {
  const issues: string[] = [];
  if (!participant) {
    issues.push("Select a participant from My Household.");
    return issues;
  }
  if (!session || !program) {
    issues.push("This session is no longer available.");
    return issues;
  }
  const age = participant.dateOfBirth ? calculateAgeOnDate(participant.dateOfBirth, session.startsAt) : undefined;
  if (typeof program.minimumAge === "number" && typeof program.maximumAge === "number") {
    if ((typeof age === "number" && age < program.minimumAge) || (typeof age === "number" && age > program.maximumAge)) {
      issues.push(`Must be ${program.minimumAge}–${program.maximumAge} years old.`);
    }
  } else if (typeof program.minimumAge === "number" && typeof age === "number" && age < program.minimumAge) {
    issues.push(`Must be at least ${program.minimumAge} years old.`);
  } else if (typeof program.maximumAge === "number" && typeof age === "number" && age > program.maximumAge) {
    issues.push(`Must be ${program.maximumAge} years old or younger.`);
  }
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
    if (!hasWaivers) issues.push("Facility waiver required.");
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
  if (program.prerequisites?.trim()) issues.push(`Prerequisites required: ${program.prerequisites}.`);
  if (session.enrolled >= session.capacity && session.waitlistEnabled) issues.push("Session is full. Checkout will place this registration on the waitlist.");
  if (session.enrolled >= session.capacity && !session.waitlistEnabled) issues.push("Session is full and waitlist registration is unavailable.");
  return issues;
}

function buildProductEligibilityIssues({ participant, product, portal }: { participant?: Customer; product?: PosProduct; portal: ReturnType<typeof useCustomerPortalData> }) {
  const issues: string[] = [];
  if (!participant) {
    issues.push("Select a participant from My Household.");
    return issues;
  }
  if (!product) {
    issues.push("This item is no longer available.");
    return issues;
  }
  if (product.waiverRequired) {
    const status = portal.getWaiverStatusForCustomer(participant.id, "wtpl_general");
    if (!(status === "valid" || status === "expiring_soon")) issues.push("Facility waiver required.");
  }
  if (typeof product.minimumAge === "number" && participant.dateOfBirth) {
    const age = calculateAgeOnDate(participant.dateOfBirth, `${portal.activeDateKey}T00:00:00Z`);
    if (typeof age === "number" && age < product.minimumAge) issues.push(`Must be at least ${product.minimumAge} years old.`);
  }
  if (product.trackInventory && (product.inventoryByLocation?.[portal.activeLocationId] ?? 0) <= 0) issues.push("This item is out of stock.");
  return issues;
}

function buildWaiverHref(orgSlug: string, waiverTemplateId: string, customerId: string) {
  const params = new URLSearchParams({ customerId, returnTo: `/p/${orgSlug}/checkout?step=3` });
  return `/p/${orgSlug}/waivers/${waiverTemplateId}?${params.toString()}`;
}

function getCustomerAge(customer: Customer) {
  if (!customer.dateOfBirth) return undefined;
  return calculateAgeOnDate(customer.dateOfBirth, new Date().toISOString());
}

function calculateAgeOnDate(dateOfBirth: string, referenceIso: string) {
  const dob = new Date(`${dateOfBirth}T00:00:00Z`);
  const reference = new Date(referenceIso);
  if (Number.isNaN(dob.getTime()) || Number.isNaN(reference.getTime())) return undefined;
  return Math.max(0, Math.floor((reference.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.2425)));
}

function getStepDescription(step: number) {
  switch (step) {
    case 0:
      return "Pick the program, membership, pass, or retail items you want to buy.";
    case 1:
      return "Choose which household member each item belongs to.";
    case 2:
      return "Review age, waiver, membership, capacity, and guardian requirements.";
    case 3:
      return "Finish any required waivers, then return here to continue checkout.";
    case 4:
      return "Review the cart, participant assignments, pricing, and waitlist status.";
    case 5:
      return "Choose a payment method and confirm billing details.";
    case 6:
      return "Your confirmation, receipt, and next steps are ready.";
    default:
      return "Complete this step to continue.";
  }
}

function clampStep(step: number) {
  return Math.max(0, Math.min(STEPS.length - 1, step));
}

function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={`space-y-1 ${className ?? ""}`}>
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
