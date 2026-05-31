"use client";

import { useMemo, useState } from "react";
import { PermissionGate } from "@/components/staff/permission-gate";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormField } from "@/components/shared/form-layout";
import { useCustomerState } from "@/lib/state/customer-state";
import { useWorkstationState } from "@/lib/state/workstation-state";
import type { WaiverExpirationRuleType } from "@/types/domain";

const EXPIRATION_OPTIONS: Array<{ value: WaiverExpirationRuleType; label: string }> = [
  { value: "never", label: "Never" },
  { value: "fixed_date", label: "Fixed Date" },
  { value: "days_after_signing", label: "X Days After Signing" },
  { value: "annual", label: "Annual" },
  { value: "program_completion", label: "Program Completion" },
  { value: "membership_expiration", label: "Membership Expiration" },
  { value: "per_transaction", label: "Per Transaction" }
];

function titleCase(text: string) {
  return text
    .replaceAll("_", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export default function WaiversPage() {
  const { activeStaff } = useWorkstationState();
  const {
    waiverTemplates,
    waiverTemplateVersions,
    waivers,
    customers,
    createWaiverTemplate,
    createWaiverTemplateVersion,
    signWaiverForCustomer,
    getWaiverStatusForCustomer
  } = useCustomerState();

  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [expirationRuleType, setExpirationRuleType] = useState<WaiverExpirationRuleType>("days_after_signing");
  const [expirationDays, setExpirationDays] = useState(365);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [nextVersion, setNextVersion] = useState("1.1");
  const [signTemplateId, setSignTemplateId] = useState<string>("");
  const [signCustomerId, setSignCustomerId] = useState<string>("");
  const [typedName, setTypedName] = useState("");
  const [relationship, setRelationship] = useState<"self" | "parent_guardian" | "spouse_partner" | "other">("self");
  const [feedback, setFeedback] = useState("");

  const metrics = useMemo(() => {
    let missing = 0;
    let expired = 0;
    let expiring30 = 0;
    let outdated = 0;
    customers.forEach((customer) => {
      const status = getWaiverStatusForCustomer(customer.id, "wtpl_general");
      if (status === "missing") missing += 1;
      if (status === "expired") expired += 1;
      if (status === "expiring_soon") expiring30 += 1;
      if (status === "outdated_version") outdated += 1;
    });
    return { missing, expired, expiring30, outdated, signed: waivers.length };
  }, [customers, waivers.length, getWaiverStatusForCustomer]);

  const requiredProgramTemplates = useMemo(() => {
    return waiverTemplates.filter((template) => template.active).sort((a, b) => a.name.localeCompare(b.name));
  }, [waiverTemplates]);

  return (
    <PermissionGate permission="manageWaivers">
      <section className="space-y-4">
        <PageHeader
          title="Waivers"
          description="Create, version, assign, sign, and validate facility waivers and documents."
        />

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">Waivers Missing</p><p className="text-2xl font-semibold">{metrics.missing}</p></article>
          <article className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">Expired Waivers</p><p className="text-2xl font-semibold">{metrics.expired}</p></article>
          <article className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">Expiring in 30 Days</p><p className="text-2xl font-semibold">{metrics.expiring30}</p></article>
          <article className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">Outdated Versions</p><p className="text-2xl font-semibold">{metrics.outdated}</p></article>
        </div>

        {feedback ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{feedback}</p> : null}

        <div className="grid gap-4 xl:grid-cols-2">
          <section className="rounded-xl border bg-card p-4 space-y-3">
            <h3 className="text-base font-semibold">Waiver Templates</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="Name">
                <input className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" value={templateName} onChange={(event) => setTemplateName(event.target.value)} />
              </FormField>
              <FormField label="Expiration Rule">
                <select className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" value={expirationRuleType} onChange={(event) => setExpirationRuleType(event.target.value as WaiverExpirationRuleType)}>
                  {EXPIRATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </FormField>
              <FormField label="Description" className="md:col-span-2">
                <textarea className="min-h-24 w-full rounded-md border border-input bg-white px-3 py-2 text-sm" value={templateDescription} onChange={(event) => setTemplateDescription(event.target.value)} />
              </FormField>
              <FormField label="Days After Signing">
                <input type="number" min={0} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" value={expirationDays} onChange={(event) => setExpirationDays(Number(event.target.value) || 0)} />
              </FormField>
            </div>
            <Button
              onClick={() => {
                const result = createWaiverTemplate({
                  name: templateName,
                  description: templateDescription,
                  expirationRuleType,
                  expirationDays: expirationRuleType === "days_after_signing" ? expirationDays : undefined,
                  effectiveDate: new Date().toISOString().slice(0, 10),
                  createdByStaffId: activeStaff?.id
                });
                setFeedback(result.message);
                if (result.ok) {
                  setTemplateName("");
                  setTemplateDescription("");
                }
              }}
            >
              Create Template
            </Button>
            <div className="space-y-2">
              {waiverTemplates.map((template) => {
                const currentVersion = waiverTemplateVersions.find((entry) => entry.id === template.currentVersionId);
                return (
                  <article key={template.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{template.name}</p>
                      <Badge tone={template.active ? "success" : "muted"}>{template.active ? "Active" : "Archived"}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{template.description || "No description"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Current version: {currentVersion?.version ?? "—"} • Effective {template.effectiveDate}</p>
                    <p className="text-xs text-muted-foreground">Expiration: {titleCase(template.expirationRuleType)}{template.expirationDays ? ` (${template.expirationDays} days)` : ""}</p>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border bg-card p-4 space-y-3">
            <h3 className="text-base font-semibold">Versioning + Signing</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="Template">
                <select className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>
                  <option value="">Select template</option>
                  {requiredProgramTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                </select>
              </FormField>
              <FormField label="New Version">
                <input className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" value={nextVersion} onChange={(event) => setNextVersion(event.target.value)} />
              </FormField>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                if (!selectedTemplateId) {
                  setFeedback("Select a template before creating a version.");
                  return;
                }
                const result = createWaiverTemplateVersion({
                  templateId: selectedTemplateId,
                  version: nextVersion,
                  effectiveDate: new Date().toISOString().slice(0, 10),
                  blocks: [
                    { id: `blk_${Math.random().toString(36).slice(2, 7)}`, type: "heading", label: "Heading", content: "Updated waiver heading" },
                    { id: `blk_${Math.random().toString(36).slice(2, 7)}`, type: "required_checkbox", label: "I agree", required: true },
                    { id: `blk_${Math.random().toString(36).slice(2, 7)}`, type: "typed_name", label: "Typed name", required: true }
                  ],
                  createdByStaffId: activeStaff?.id
                });
                setFeedback(result.message);
              }}
            >
              Create New Version
            </Button>

            <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
              Waiver builder stores structured blocks for future online signing, kiosk mode, and PDF export. External signature providers are not integrated yet.
            </div>

            <h4 className="text-sm font-semibold">Mock Signing Workflow</h4>
            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="Customer">
                <select className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" value={signCustomerId} onChange={(event) => setSignCustomerId(event.target.value)}>
                  <option value="">Select customer</option>
                  {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.firstName} {customer.lastName}</option>)}
                </select>
              </FormField>
              <FormField label="Waiver Template">
                <select className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" value={signTemplateId} onChange={(event) => setSignTemplateId(event.target.value)}>
                  <option value="">Select waiver</option>
                  {requiredProgramTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                </select>
              </FormField>
              <FormField label="Typed Name">
                <input className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" value={typedName} onChange={(event) => setTypedName(event.target.value)} />
              </FormField>
              <FormField label="Relationship">
                <select className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" value={relationship} onChange={(event) => setRelationship(event.target.value as typeof relationship)}>
                  <option value="self">Self</option>
                  <option value="parent_guardian">Parent</option>
                  <option value="spouse_partner">Spouse</option>
                  <option value="other">Other</option>
                </select>
              </FormField>
            </div>
            <Button
              onClick={() => {
                if (!signCustomerId || !signTemplateId || !typedName.trim()) {
                  setFeedback("Select customer, waiver template, and typed name.");
                  return;
                }
                const result = signWaiverForCustomer({
                  customerId: signCustomerId,
                  templateId: signTemplateId,
                  typedName,
                  signedByName: typedName,
                  signedByCustomerId: signCustomerId,
                  signedByRelationship: relationship,
                  signedByStaffId: activeStaff?.id,
                  updatedByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : undefined
                });
                setFeedback(result.message);
                if (result.ok) setTypedName("");
              }}
            >
              Mark Waiver Signed
            </Button>
          </section>
        </div>
      </section>
    </PermissionGate>
  );
}

