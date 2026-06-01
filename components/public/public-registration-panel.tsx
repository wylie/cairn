"use client";

import { useMemo, useState } from "react";
import type { Program, ClassCampSession, Customer } from "@/types/domain";
import { getLocationName, getRegistrationStateForCustomer, getSessionStats, getProgramPricing } from "@/lib/public-programs";
import { customers as seedCustomers } from "@/lib/mocks/customers";
import { waivers as seedWaivers } from "@/lib/mocks/waivers";

export function PublicRegistrationPanel({
  orgSlug,
  program,
  session
}: {
  orgSlug: string;
  program: Program;
  session: ClassCampSession;
}) {
  const [step, setStep] = useState<"auth" | "waiver" | "confirm" | "done">("auth");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isMember, setIsMember] = useState(false);
  const [joinedWaitlist, setJoinedWaitlist] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const stats = getSessionStats(session);
  const pricing = getProgramPricing(program);

  const existingCustomer = useMemo(
    () => seedCustomers.find((entry) => entry.organizationId === program.organizationId && entry.email.toLowerCase() === email.trim().toLowerCase()),
    [email, program.organizationId]
  );
  const hasValidWaiver = useMemo(() => {
    if (!existingCustomer?.waiverId) return false;
    const waiver = seedWaivers.find((entry) => entry.id === existingCustomer.waiverId);
    return waiver?.status === "valid";
  }, [existingCustomer]);
  const existingRegistration = useMemo(
    () => getRegistrationStateForCustomer(session.id, existingCustomer?.id),
    [session.id, existingCustomer?.id]
  );
  const waitlistPosition = stats.waitlisted + 1;

  const finalPrice = isMember && pricing.memberCents !== null ? pricing.memberCents : pricing.nonMemberCents;

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <h2 className="text-lg font-semibold">Register</h2>
      <p className="text-sm text-muted-foreground">
        {finalPrice !== null ? `Price: ${formatCents(finalPrice)} (${isMember ? "member" : "non-member"})` : "Pricing available after login"}
      </p>
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isMember} onChange={(event) => setIsMember(event.target.checked)} />
        I have an active membership
      </label>

      {step === "auth" ? (
        <div className="space-y-2">
          <input
            className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm"
            placeholder="Email login"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          {!existingCustomer ? (
            <input
              className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm"
              placeholder="Full name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          ) : null}
          <p className="text-xs text-muted-foreground">
            {existingCustomer ? "Existing account found." : "New account will be created on confirmation."}
          </p>
          {existingRegistration ? (
            <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              This customer is already {existingRegistration.status} for this session. Duplicate registrations are blocked.
            </p>
          ) : null}
          <Button
            disabled={Boolean(existingRegistration)}
            onClick={() => {
              if (program.requiresWaiver && !hasValidWaiver) {
                setStep("waiver");
                return;
              }
              setStep("confirm");
            }}
          >
            Continue
          </Button>
        </div>
      ) : null}

      {step === "waiver" ? (
        <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-900">Waiver required before registration.</p>
          <p className="text-sm text-amber-900">Public waiver signing is coming soon. Please complete waiver at front desk.</p>
          <Button variant="secondary" onClick={() => setStep("confirm")}>Continue with waiver placeholder</Button>
        </div>
      ) : null}

      {step === "confirm" ? (
        <div className="space-y-2">
          <p className="text-sm">Program: {program.title}</p>
          <p className="text-sm">Session: {new Date(session.startsAt).toLocaleString("en-US")}</p>
          <p className="text-sm">Instructor: {session.instructorName ?? "TBD"}</p>
          <p className="text-sm">Location: {getLocationName(session.locationId)}</p>
          <p className="text-sm">Registration ID: REG-{session.id.toUpperCase()}</p>
          {stats.full ? <p className="text-sm text-muted-foreground">Session is full. Current waitlist position if joined: #{waitlistPosition}</p> : null}
          {stats.full ? (
            <Button
              onClick={() => {
                setJoinedWaitlist(true);
                setStatusMessage(`Waitlist position #${waitlistPosition} confirmed.`);
                setStep("done");
              }}
            >
              Join Waitlist
            </Button>
          ) : (
            <Button
              onClick={() => {
                setStatusMessage("Registration confirmation recorded.");
                setStep("done");
              }}
            >
              Register
            </Button>
          )}
        </div>
      ) : null}

      {step === "done" ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          {joinedWaitlist ? "Waitlist confirmation complete." : "Registration confirmed."} {statusMessage ?? "Placeholder confirmation event created."}
        </div>
      ) : null}

      <div className="text-xs text-muted-foreground">
        Account pages: <a className="underline" href={`/p/${orgSlug}/account/dashboard`}>Go to account</a>
      </div>
    </div>
  );
}

function Button({
  children,
  onClick,
  disabled = false,
  variant = "default"
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "secondary";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-10 items-center rounded-md px-3 text-sm font-medium ${
        variant === "default" ? "bg-primary text-primary-foreground disabled:opacity-50" : "border border-input bg-white hover:bg-secondary disabled:opacity-50"
      }`}
    >
      {children}
    </button>
  );
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}
