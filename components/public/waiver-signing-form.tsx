"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatDateTime } from "@/lib/format/date";
import { useCustomerState } from "@/lib/state/customer-state";
import { useCustomerPortalData } from "@/lib/portal/use-customer-portal-data";
import { getSessionFromCookieClient } from "@/lib/tenant/client";
import type { WaiverTemplate, WaiverTemplateVersion, HouseholdRelationship } from "@/types/domain";

type SigningMode = "public" | "account" | "kiosk";

const RELATIONSHIPS: Array<{ value: "self" | HouseholdRelationship; label: string }> = [
  { value: "self", label: "Self" },
  { value: "parent", label: "Parent" },
  { value: "guardian", label: "Guardian" },
  { value: "caregiver", label: "Caregiver" }
];

export function WaiverSigningForm({
  orgSlug,
  template,
  version,
  mode,
  defaultCustomerId,
  onSigned
}: {
  orgSlug: string;
  template: WaiverTemplate;
  version: WaiverTemplateVersion;
  mode: SigningMode;
  defaultCustomerId?: string;
  onSigned?: () => void;
}) {
  const {
    customers,
    households,
    householdMembers,
    signWaiverForCustomer,
    getWaiverStatusForCustomer,
    getSignedWaiverRecordsForCustomer
  } = useCustomerState();
  const { visibleCustomerIds, primaryCustomerId } = useCustomerPortalData();
  const session = getSessionFromCookieClient();

  const [query, setQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState(defaultCustomerId ?? "");
  const [signerName, setSignerName] = useState("");
  const [typedName, setTypedName] = useState("");
  const [relationship, setRelationship] = useState<"self" | HouseholdRelationship>("self");
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const requiredChecks = useMemo(
    () => version.blocks.filter((block) => block.type === "required_checkbox" || block.type === "checkbox"),
    [version.blocks]
  );

  const lookupScope = useMemo(() => {
    if (mode === "kiosk") {
      return session?.kind === "staff" && session.organizationSlugs.includes(orgSlug) ? "staff_lookup" : "exact_only";
    }
    if (mode === "account" || (session?.kind === "customer" && session.organizationSlugs.includes(orgSlug))) {
      return "household_only";
    }
    return "exact_only";
  }, [mode, orgSlug, session]);

  const eligibleCustomerIds = useMemo(() => {
    if (lookupScope === "staff_lookup") {
      return customers
        .filter((entry) => entry.organizationId === template.organizationId)
        .map((entry) => entry.id);
    }
    if (lookupScope === "household_only") {
      return visibleCustomerIds;
    }
    const exactMatch = customers.find(
      (entry) => entry.id === defaultCustomerId && entry.organizationId === template.organizationId
    );
    return exactMatch ? [exactMatch.id] : [];
  }, [customers, defaultCustomerId, lookupScope, template.organizationId, visibleCustomerIds]);

  const customerPool = useMemo(
    () => customers.filter((entry) => eligibleCustomerIds.includes(entry.id)),
    [customers, eligibleCustomerIds]
  );

  useEffect(() => {
    if (customerPool.length === 1) {
      const onlyCustomerId = customerPool[0]?.id ?? "";
      if (selectedCustomerId !== onlyCustomerId) {
        setSelectedCustomerId(onlyCustomerId);
      }
      return;
    }
    if (selectedCustomerId && eligibleCustomerIds.includes(selectedCustomerId)) return;
    if (defaultCustomerId && eligibleCustomerIds.includes(defaultCustomerId)) {
      setSelectedCustomerId(defaultCustomerId);
      return;
    }
    if (selectedCustomerId) {
      setSelectedCustomerId("");
    }
  }, [customerPool, defaultCustomerId, eligibleCustomerIds, selectedCustomerId]);

  useEffect(() => {
    if (!defaultCustomerId) return;
    if (eligibleCustomerIds.includes(defaultCustomerId)) return;
    setError("You can only sign waivers for yourself or household members you manage.");
  }, [defaultCustomerId, eligibleCustomerIds]);

  const filteredCustomers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customerPool.slice(0, 8);
    return customerPool.filter((entry) => {
      const haystack = `${entry.firstName} ${entry.lastName} ${entry.email} ${entry.phone} ${entry.memberId}`.toLowerCase();
      return haystack.includes(q);
    }).slice(0, 8);
  }, [query, customerPool]);

  const selectedCustomer = customerPool.find((entry) => entry.id === selectedCustomerId);
  const selectedStatus = selectedCustomer ? getWaiverStatusForCustomer(selectedCustomer.id, template.id) : "missing";
  const latestSigned = selectedCustomer ? getSignedWaiverRecordsForCustomer(selectedCustomer.id).find((entry) => entry.templateId === template.id) : undefined;
  const selectedCustomerAuthorized = selectedCustomer ? eligibleCustomerIds.includes(selectedCustomer.id) : false;
  const shouldShowSelector = customerPool.length > 1;
  const resultCountLabel =
    query.trim().length > 0
      ? `Showing ${filteredCustomers.length} of ${customerPool.length} eligible household members`
      : `${customerPool.length} eligible ${customerPool.length === 1 ? "person" : "people"}`;

  const signingForLabel = selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : "No customer selected";

  const householdGuardianHint = useMemo(() => {
    if (!selectedCustomer) return null;
    const memberRows = householdMembers.filter((entry) => entry.customerId === selectedCustomer.id);
    if (memberRows.length === 0) return null;
    const household = households.find((entry) => entry.id === memberRows[0].householdId);
    if (!household) return null;
    const guardians = householdMembers
      .filter((entry) => entry.householdId === household.id && (entry.role === "guardian" || entry.role === "primary-adult" || entry.role === "adult"))
      .map((entry) => customerPool.find((customer) => customer.id === entry.customerId))
      .filter(Boolean)
      .map((customer) => `${customer!.firstName} ${customer!.lastName}`);
    if (guardians.length === 0) return null;
    return guardians.join(", ");
  }, [selectedCustomer, households, householdMembers, customerPool]);

  const allRequiredAccepted = requiredChecks.every((block) => checks[block.id]);
  const canSubmit = Boolean(selectedCustomerAuthorized && typedName.trim() && signerName.trim() && allRequiredAccepted);

  return (
    <section className={`space-y-4 rounded-xl border bg-card p-4 ${mode === "kiosk" ? "max-w-3xl mx-auto" : ""}`}>
      <header>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{mode === "kiosk" ? "Kiosk" : mode === "account" ? "Customer Portal" : "Public Waiver"}</p>
        <h2 className="text-xl font-semibold">{template.name}</h2>
        <p className="text-sm text-muted-foreground">Effective version {version.version} • Expires: {template.expirationRuleType === "days_after_signing" ? `${template.expirationDays ?? 0} days after signing` : template.expirationRuleType.replaceAll("_", " ")}</p>
      </header>

      {shouldShowSelector ? (
        <div className="space-y-2 rounded-md border bg-white p-3">
          <p className="text-sm font-medium">Who is this waiver for?</p>
          <p className="text-xs text-muted-foreground">
            {lookupScope === "staff_lookup" ? "Search facility customers." : "Only household members you can manage are shown here."}
          </p>
          <input
            className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm"
            placeholder="Search by name, email, phone, or member ID"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">{resultCountLabel}</p>
          <div className="space-y-1">
            {filteredCustomers.length === 0 ? (
              <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
                {lookupScope === "staff_lookup"
                  ? "No customers found. Refine your search."
                  : "No eligible household members found for this waiver."}
              </p>
            ) : null}
            {filteredCustomers.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  setSelectedCustomerId(entry.id);
                  setError("");
                }}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm ${selectedCustomerId === entry.id ? "border-sky-400 bg-sky-50" : "border-border"}`}
              >
                <p className="font-medium">{entry.firstName} {entry.lastName}</p>
                <p className="text-xs text-muted-foreground">{entry.memberId} • {entry.email}</p>
              </button>
            ))}
          </div>
        </div>
      ) : customerPool.length === 1 ? (
        <div className="rounded-md border bg-white p-3 text-sm">
          <p className="font-medium">Who is this waiver for?</p>
          <p className="mt-1 text-muted-foreground">This waiver will be signed for the eligible person on this account.</p>
        </div>
      ) : (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">Who is this waiver for?</p>
          <p className="mt-1">
            {mode === "kiosk"
              ? "Staff authorization is required before searching facility customers from kiosk mode."
              : "You can only sign waivers for yourself or household members you manage."}
          </p>
        </div>
      )}

      {selectedCustomer ? (
        <div className="rounded-md border bg-secondary/20 p-3 text-sm">
          <p>Signing for: <strong>{signingForLabel}</strong></p>
          <p>Status: {selectedStatus === "valid" ? "Valid" : selectedStatus === "expiring_soon" ? "Expiring Soon" : selectedStatus === "outdated_version" ? "Outdated Version" : selectedStatus === "expired" ? "Expired" : "Missing"}</p>
          {latestSigned ? <p>Last signed: {formatDateTime(latestSigned.signedAt)}</p> : null}
          {householdGuardianHint ? <p>Household guardian(s): {householdGuardianHint}</p> : null}
        </div>
      ) : null}

      <article className="space-y-2 rounded-md border bg-white p-4">
        <h3 className="font-semibold">Review waiver content</h3>
        <div className="space-y-2 text-sm">
          {version.blocks.map((block) => (
            <div key={block.id}>
              {block.type === "heading" ? <h4 className="font-semibold">{block.content || block.label}</h4> : null}
              {block.type !== "heading" ? <p className="text-muted-foreground whitespace-pre-wrap">{block.content || block.label}</p> : null}
            </div>
          ))}
        </div>
      </article>

      <article className="space-y-3 rounded-md border bg-white p-4">
        <h3 className="font-semibold">Acknowledgements</h3>
        {requiredChecks.length === 0 ? <p className="text-sm text-muted-foreground">No additional acknowledgement checkboxes required for this version.</p> : null}
        {requiredChecks.map((check) => (
          <label key={check.id} className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={Boolean(checks[check.id])} onChange={(event) => setChecks((prev) => ({ ...prev, [check.id]: event.target.checked }))} />
            <span>{check.label}</span>
          </label>
        ))}

        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Signer name</span>
            <input className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" value={signerName} onChange={(event) => setSignerName(event.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Relationship</span>
            <select className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" value={relationship} onChange={(event) => setRelationship(event.target.value as "self" | HouseholdRelationship)}>
              {RELATIONSHIPS.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="font-medium">Typed signature</span>
            <input className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" value={typedName} onChange={(event) => setTypedName(event.target.value)} placeholder="Type full legal name" />
          </label>
        </div>

        {!allRequiredAccepted && requiredChecks.length > 0 ? <p className="text-xs text-amber-700">All required acknowledgements must be accepted before submitting.</p> : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => {
              if (!selectedCustomer || !selectedCustomerAuthorized) {
                setFeedback("");
                setError("You can only sign waivers for yourself or household members you manage.");
                return;
              }
              const result = signWaiverForCustomer({
                customerId: selectedCustomer.id,
                templateId: template.id,
                typedName,
                signedByName: signerName,
                signedByCustomerId: relationship === "self" ? selectedCustomer.id : undefined,
                signedByRelationship: relationship,
                source: mode === "kiosk" ? "kiosk" : mode === "public" ? "online" : "online",
                ipAddressPlaceholder: "0.0.0.0"
              });
              setError("");
              setFeedback(result.message);
              if (result.ok) onSigned?.();
            }}
            className="inline-flex h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Submit Waiver
          </button>
          {mode !== "account" ? (
            <Link href={`/p/${orgSlug}/account/waivers`} className="inline-flex h-11 items-center rounded-md border border-input px-4 text-sm">
              Open Account Waivers
            </Link>
          ) : null}
        </div>
      </article>

      {error ? <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{error}</p> : null}
      {feedback ? <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{feedback}</p> : null}
    </section>
  );
}
