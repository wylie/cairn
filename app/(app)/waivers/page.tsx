"use client";

import { useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { PermissionGate } from "@/components/staff/permission-gate";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormField } from "@/components/shared/form-layout";
import { useCustomerState } from "@/lib/state/customer-state";
import { useWorkstationState } from "@/lib/state/workstation-state";
import type { WaiverExpirationRuleType, WaiverTemplateBlock } from "@/types/domain";

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
  return text.replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function buildBlocksFromText(content: string): WaiverTemplateBlock[] {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return [{ id: `blk_${Math.random().toString(36).slice(2, 7)}`, type: "paragraph", label: "Waiver content", content: "" }];
  }
  return lines.map((line) => {
    if (line.startsWith("# ")) {
      return {
        id: `blk_${Math.random().toString(36).slice(2, 7)}`,
        type: "heading" as const,
        label: "Heading",
        content: line.slice(2).trim()
      };
    }
    if (line.startsWith("- ")) {
      return {
        id: `blk_${Math.random().toString(36).slice(2, 7)}`,
        type: "paragraph" as const,
        label: "Bullet",
        content: line
      };
    }
    return {
      id: `blk_${Math.random().toString(36).slice(2, 7)}`,
      type: "paragraph" as const,
      label: "Paragraph",
      content: line
    };
  });
}

function renderBlocks(blocks: WaiverTemplateBlock[]) {
  return (
    <div className="space-y-2 rounded-md border bg-white p-3 text-sm">
      {blocks.map((block) => (
        <div key={block.id}>
          {block.type === "heading" ? <h4 className="font-semibold">{block.content || block.label}</h4> : null}
          {block.type !== "heading" ? <p className="text-muted-foreground whitespace-pre-wrap">{block.content || block.label}</p> : null}
          {(block.type === "required_checkbox" || block.type === "checkbox") ? (
            <p className="text-xs text-muted-foreground">Checkbox: {block.required ? "Required" : "Optional"}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default function WaiversPage() {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const orgSlug = pathname.split("/").filter(Boolean)[1] ?? "summit";
  const statusFilter = searchParams?.get("status");
  const { activeStaff } = useWorkstationState();
  const {
    waiverTemplates,
    waiverTemplateVersions,
    waivers,
    customers,
    createWaiverTemplate,
    createWaiverTemplateVersion,
    updateWaiverTemplate,
    archiveWaiverTemplate,
    signWaiverForCustomer,
    getWaiverStatusForCustomer
  } = useCustomerState();

  const [selectedTemplateId, setSelectedTemplateId] = useState(waiverTemplates[0]?.id ?? "");
  const [feedback, setFeedback] = useState("");
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDescription, setNewTemplateDescription] = useState("");
  const [newTemplateContent, setNewTemplateContent] = useState("# General Facility Waiver\nI understand facility activities carry inherent risk.");
  const [newExpirationType, setNewExpirationType] = useState<WaiverExpirationRuleType>("days_after_signing");
  const [newExpirationDays, setNewExpirationDays] = useState(365);

  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editExpirationType, setEditExpirationType] = useState<WaiverExpirationRuleType>("days_after_signing");
  const [editExpirationDays, setEditExpirationDays] = useState(365);

  const [newVersionLabel, setNewVersionLabel] = useState("3.0");
  const [newVersionChangeNotes, setNewVersionChangeNotes] = useState("");
  const [newVersionContent, setNewVersionContent] = useState("# General Facility Waiver\nUpdated legal content.");
  const [compareVersionAId, setCompareVersionAId] = useState("");
  const [compareVersionBId, setCompareVersionBId] = useState("");

  const [signCustomerId, setSignCustomerId] = useState("");
  const [signTypedName, setSignTypedName] = useState("");
  const [signRelationship, setSignRelationship] = useState<"self" | "parent_guardian" | "spouse_partner" | "other">("self");

  const selectedTemplate = useMemo(
    () => waiverTemplates.find((entry) => entry.id === selectedTemplateId),
    [waiverTemplates, selectedTemplateId]
  );

  const selectedTemplateVersions = useMemo(() => {
    if (!selectedTemplate) return [];
    return selectedTemplate.versionIds
      .map((id) => waiverTemplateVersions.find((entry) => entry.id === id))
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
  }, [selectedTemplate, waiverTemplateVersions]);

  const currentVersion = useMemo(() => {
    if (!selectedTemplate) return undefined;
    return waiverTemplateVersions.find((entry) => entry.id === selectedTemplate.currentVersionId);
  }, [selectedTemplate, waiverTemplateVersions]);

  const compareSummary = useMemo(() => {
    const versionA = waiverTemplateVersions.find((entry) => entry.id === compareVersionAId);
    const versionB = waiverTemplateVersions.find((entry) => entry.id === compareVersionBId);
    if (!versionA || !versionB) return null;
    const blockDelta = versionB.blocks.length - versionA.blocks.length;
    return {
      versionA,
      versionB,
      blockDelta
    };
  }, [compareVersionAId, compareVersionBId, waiverTemplateVersions]);

  const metrics = useMemo(() => {
    let missing = 0;
    let expired = 0;
    let expiringSoon = 0;
    let outdated = 0;
    customers.forEach((customer) => {
      const status = getWaiverStatusForCustomer(customer.id, "wtpl_general");
      if (status === "missing") missing += 1;
      if (status === "expired") expired += 1;
      if (status === "expiring_soon") expiringSoon += 1;
      if (status === "outdated_version") outdated += 1;
    });
    return { missing, expired, expiringSoon, outdated, signed: waivers.length };
  }, [customers, waivers.length, getWaiverStatusForCustomer]);

  const complianceRows = useMemo(
    () =>
      customers
        .map((customer) => ({
          customer,
          status: getWaiverStatusForCustomer(customer.id, "wtpl_general")
        }))
        .filter((entry) => {
          if (!statusFilter) return true;
          return entry.status === statusFilter;
        }),
    [customers, getWaiverStatusForCustomer, statusFilter]
  );

  const openTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = waiverTemplates.find((entry) => entry.id === templateId);
    if (!template) return;
    setEditName(template.name);
    setEditDescription(template.description ?? "");
    setEditExpirationType(template.expirationRuleType);
    setEditExpirationDays(template.expirationDays ?? 365);
    setIsEditingTemplate(false);
    const cv = waiverTemplateVersions.find((entry) => entry.id === template.currentVersionId);
    const lines = (cv?.blocks ?? []).map((block) => block.content || block.label).join("\n");
    setNewVersionContent(lines || "# Updated Waiver\n");
  };

  return (
    <PermissionGate permission="manageWaivers">
      <section className="space-y-4">
        <PageHeader title="Waivers" description="Manage waiver templates, legal content, version history, and signed records." />

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">Waivers Missing</p><p className="text-2xl font-semibold">{metrics.missing}</p></article>
          <article className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">Expired Waivers</p><p className="text-2xl font-semibold">{metrics.expired}</p></article>
          <article className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">Expiring Soon</p><p className="text-2xl font-semibold">{metrics.expiringSoon}</p></article>
          <article className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">Outdated Versions</p><p className="text-2xl font-semibold">{metrics.outdated}</p></article>
        </div>

        {feedback ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{feedback}</p> : null}

        <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
          <section className="space-y-3 rounded-xl border bg-card p-4">
            <h3 className="text-base font-semibold">Waiver Templates</h3>
            <div className="space-y-2">
              {waiverTemplates.map((template) => {
                const version = waiverTemplateVersions.find((entry) => entry.id === template.currentVersionId);
                return (
                  <button
                    key={template.id}
                    type="button"
                    className={`w-full rounded-md border p-3 text-left transition hover:border-sky-300 ${selectedTemplateId === template.id ? "border-sky-400 bg-sky-50" : "border-border"}`}
                    onClick={() => openTemplate(template.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{template.name}</p>
                      <Badge tone={template.active ? "success" : "muted"}>{template.active ? "Active" : "Archived"}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Version {version?.version ?? "—"} • Effective {template.effectiveDate}</p>
                    <p className="text-xs text-muted-foreground">{template.expirationDays ? `${template.expirationDays} day expiration` : titleCase(template.expirationRuleType)}</p>
                  </button>
                );
              })}
            </div>

            <div className="rounded-md border p-3 space-y-3">
              <h4 className="text-sm font-semibold">Create Template</h4>
              <FormField label="Name"><input className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" value={newTemplateName} onChange={(event) => setNewTemplateName(event.target.value)} /></FormField>
              <FormField label="Description"><textarea className="min-h-20 w-full rounded-md border border-input bg-white px-3 py-2 text-sm" value={newTemplateDescription} onChange={(event) => setNewTemplateDescription(event.target.value)} /></FormField>
              <FormField label="Waiver content (legal)"><textarea className="min-h-32 w-full rounded-md border border-input bg-white px-3 py-2 text-sm" value={newTemplateContent} onChange={(event) => setNewTemplateContent(event.target.value)} /></FormField>
              <div className="grid gap-3 md:grid-cols-2">
                <FormField label="Expiration rule">
                  <select className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" value={newExpirationType} onChange={(event) => setNewExpirationType(event.target.value as WaiverExpirationRuleType)}>
                    {EXPIRATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </FormField>
                <FormField label="Days after signing">
                  <input type="number" min={0} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" value={newExpirationDays} onChange={(event) => setNewExpirationDays(Number(event.target.value) || 0)} />
                </FormField>
              </div>
              <Button
                onClick={() => {
                  const result = createWaiverTemplate({
                    name: newTemplateName,
                    description: newTemplateDescription,
                    expirationRuleType: newExpirationType,
                    expirationDays: newExpirationType === "days_after_signing" ? newExpirationDays : undefined,
                    effectiveDate: new Date().toISOString().slice(0, 10),
                    blocks: buildBlocksFromText(newTemplateContent),
                    createdByStaffId: activeStaff?.id
                  });
                  setFeedback(result.message);
                  if (result.ok && result.templateId) {
                    openTemplate(result.templateId);
                    setNewTemplateName("");
                    setNewTemplateDescription("");
                  }
                }}
              >
                Create Template
              </Button>
            </div>
          </section>

          <section className="space-y-4">
            <article className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold">Waiver Compliance</h3>
                {statusFilter ? <Badge tone="warning">Filter: {titleCase(statusFilter)}</Badge> : null}
              </div>
              <div className="space-y-2 text-sm">
                {complianceRows.length === 0 ? <p className="text-muted-foreground">No customers match this waiver filter.</p> : null}
                {complianceRows.slice(0, 12).map((entry) => (
                  <div key={entry.customer.id} className="flex items-center justify-between rounded-md border p-2">
                    <div>
                      <p className="font-medium">{entry.customer.firstName} {entry.customer.lastName}</p>
                      <p className="text-xs text-muted-foreground">{entry.customer.memberId}</p>
                    </div>
                    <Badge tone={entry.status === "valid" ? "success" : entry.status === "expiring_soon" ? "warning" : "danger"}>
                      {titleCase(entry.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            </article>
            {selectedTemplate ? (
              <>
                <article className="rounded-xl border bg-card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-semibold">{selectedTemplate.name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedTemplate.description || "No staff-facing summary yet."}</p>
                    </div>
                    <Badge tone={selectedTemplate.active ? "success" : "muted"}>{selectedTemplate.active ? "Active" : "Archived"}</Badge>
                  </div>
                  <div className="rounded-md border bg-secondary/20 p-3 text-sm">
                    <p className="font-medium">Waiver sharing</p>
                    <p className="text-muted-foreground">Direct Link</p>
                    <p className="break-all rounded bg-white px-2 py-1 text-xs">{`https://cairn.example.com/p/${orgSlug}/waivers/${selectedTemplate.id}`}</p>
                    <p className="mt-2 text-muted-foreground">QR Code</p>
                    <div className="inline-flex h-24 w-24 items-center justify-center rounded border bg-white text-[10px] text-muted-foreground">
                      QR Placeholder
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Kiosk route: {`/p/${orgSlug}/kiosk/waivers`}</p>
                  </div>
                  {!isEditingTemplate ? (
                    <>
                      <div className="grid gap-3 md:grid-cols-3 text-sm">
                        <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Current version</p><p>{currentVersion?.version ?? "—"}</p></div>
                        <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Effective date</p><p>{selectedTemplate.effectiveDate}</p></div>
                        <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Expiration</p><p>{selectedTemplate.expirationDays ? `${selectedTemplate.expirationDays} days` : titleCase(selectedTemplate.expirationRuleType)}</p></div>
                        <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Locations assigned</p><p>{(selectedTemplate.facilityAssignment ?? []).join(", ") || "None"}</p></div>
                        <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Products assigned</p><p>{(selectedTemplate.productAssignment ?? []).join(", ") || "None"}</p></div>
                        <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Branding</p><p>{selectedTemplate.brandingAssignment ?? "Default"}</p></div>
                      </div>
                      <div>
                        <p className="mb-2 text-sm font-medium">Current waiver content</p>
                        {renderBlocks(currentVersion?.blocks ?? [])}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={() => setIsEditingTemplate(true)}>Edit Template</Button>
                        <Button variant="secondary" onClick={() => {
                          const result = createWaiverTemplateVersion({
                            templateId: selectedTemplate.id,
                            version: newVersionLabel,
                            effectiveDate: new Date().toISOString().slice(0, 10),
                            blocks: buildBlocksFromText(newVersionContent),
                            createdByStaffId: activeStaff?.id
                          });
                          setFeedback(result.ok ? `${result.message}${newVersionChangeNotes ? ` ${newVersionChangeNotes}` : ""}` : result.message);
                        }}>Create New Version</Button>
                        <Button variant="secondary" onClick={() => setFeedback("Version history visible below.")}>View Version History</Button>
                        <Button variant="destructiveSubtle" onClick={() => {
                          const result = archiveWaiverTemplate(selectedTemplate.id);
                          setFeedback(result.message);
                        }}>Archive Template</Button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <FormField label="Template name"><input className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" value={editName} onChange={(event) => setEditName(event.target.value)} /></FormField>
                        <FormField label="Effective date"><input type="date" className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" value={selectedTemplate.effectiveDate} onChange={() => undefined} disabled /></FormField>
                        <FormField label="Description" className="md:col-span-2"><textarea className="min-h-20 w-full rounded-md border border-input bg-white px-3 py-2 text-sm" value={editDescription} onChange={(event) => setEditDescription(event.target.value)} /></FormField>
                        <FormField label="Expiration rule">
                          <select className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" value={editExpirationType} onChange={(event) => setEditExpirationType(event.target.value as WaiverExpirationRuleType)}>
                            {EXPIRATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        </FormField>
                        <FormField label="Days after signing"><input type="number" min={0} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" value={editExpirationDays} onChange={(event) => setEditExpirationDays(Number(event.target.value) || 0)} /></FormField>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => {
                          const result = updateWaiverTemplate(selectedTemplate.id, {
                            name: editName,
                            description: editDescription,
                            expirationRuleType: editExpirationType,
                            expirationDays: editExpirationType === "days_after_signing" ? editExpirationDays : undefined
                          });
                          setFeedback(result.message);
                          if (result.ok) setIsEditingTemplate(false);
                        }}>Save Template</Button>
                        <Button variant="secondary" onClick={() => setIsEditingTemplate(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </article>

                <article className="rounded-xl border bg-card p-4 space-y-3">
                  <h4 className="text-base font-semibold">Version History</h4>
                  <div className="space-y-2">
                    {selectedTemplateVersions.map((version) => (
                      <div key={version.id} className="rounded-md border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">v{version.version}</p>
                          <Badge tone={selectedTemplate.currentVersionId === version.id ? "success" : "muted"}>
                            {selectedTemplate.currentVersionId === version.id ? "Current" : "Archived"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Effective {version.effectiveDate}</p>
                        <p className="text-xs text-muted-foreground">{version.changeNotes || "No change notes"}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <FormField label="Compare version A">
                      <select className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" value={compareVersionAId} onChange={(event) => setCompareVersionAId(event.target.value)}>
                        <option value="">Select version</option>
                        {selectedTemplateVersions.map((entry) => <option key={entry.id} value={entry.id}>v{entry.version}</option>)}
                      </select>
                    </FormField>
                    <FormField label="Compare version B">
                      <select className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" value={compareVersionBId} onChange={(event) => setCompareVersionBId(event.target.value)}>
                        <option value="">Select version</option>
                        {selectedTemplateVersions.map((entry) => <option key={entry.id} value={entry.id}>v{entry.version}</option>)}
                      </select>
                    </FormField>
                  </div>
                  {compareSummary ? (
                    <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
                      Comparing v{compareSummary.versionA.version} to v{compareSummary.versionB.version}: {compareSummary.blockDelta > 0 ? "+" : ""}{compareSummary.blockDelta} content block(s).
                    </p>
                  ) : null}
                </article>

                <article className="rounded-xl border bg-card p-4 space-y-3">
                  <h4 className="text-base font-semibold">Create New Version</h4>
                  <FormField label="Template">
                    <select className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" value={selectedTemplate.id} onChange={() => undefined}>
                      <option value={selectedTemplate.id}>{selectedTemplate.name}</option>
                    </select>
                  </FormField>
                  <div className="grid gap-3 md:grid-cols-2">
                    <FormField label="New Version"><input className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" value={newVersionLabel} onChange={(event) => setNewVersionLabel(event.target.value)} /></FormField>
                    <FormField label="Effective date"><input type="date" className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" defaultValue={new Date().toISOString().slice(0, 10)} /></FormField>
                    <FormField label="Version notes" className="md:col-span-2"><textarea className="min-h-20 w-full rounded-md border border-input bg-white px-3 py-2 text-sm" value={newVersionChangeNotes} onChange={(event) => setNewVersionChangeNotes(event.target.value)} /></FormField>
                    <FormField label="Waiver content (legal)" className="md:col-span-2">
                      <textarea className="min-h-48 w-full rounded-md border border-input bg-white px-3 py-2 text-sm" value={newVersionContent} onChange={(event) => setNewVersionContent(event.target.value)} />
                    </FormField>
                  </div>
                  <Button variant="secondary" onClick={() => {
                    const result = createWaiverTemplateVersion({
                      templateId: selectedTemplate.id,
                      version: newVersionLabel,
                      effectiveDate: new Date().toISOString().slice(0, 10),
                      blocks: buildBlocksFromText(newVersionContent),
                      createdByStaffId: activeStaff?.id
                    });
                    setFeedback(result.ok ? `${result.message}${newVersionChangeNotes ? ` ${newVersionChangeNotes}` : ""}` : result.message);
                  }}>
                    Create Version
                  </Button>
                </article>

                <article className="rounded-xl border bg-card p-4 space-y-3">
                  <h4 className="text-base font-semibold">Mock Signing</h4>
                  <div className="grid gap-3 md:grid-cols-3">
                    <FormField label="Waiver Template">
                      <select
                        className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm"
                        value={selectedTemplate.id}
                        onChange={(event) => openTemplate(event.target.value)}
                      >
                        {waiverTemplates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Customer">
                      <select className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" value={signCustomerId} onChange={(event) => setSignCustomerId(event.target.value)}>
                        <option value="">Select customer</option>
                        {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.firstName} {customer.lastName}</option>)}
                      </select>
                    </FormField>
                    <FormField label="Typed Name"><input className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" value={signTypedName} onChange={(event) => setSignTypedName(event.target.value)} /></FormField>
                    <FormField label="Relationship">
                      <select className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" value={signRelationship} onChange={(event) => setSignRelationship(event.target.value as typeof signRelationship)}>
                        <option value="self">Self</option>
                        <option value="parent_guardian">Parent</option>
                        <option value="spouse_partner">Spouse</option>
                        <option value="other">Other</option>
                      </select>
                    </FormField>
                  </div>
                  <Button onClick={() => {
                    if (!signCustomerId || !signTypedName.trim()) {
                      setFeedback("Choose customer and typed name.");
                      return;
                    }
                    const result = signWaiverForCustomer({
                      customerId: signCustomerId,
                      templateId: selectedTemplate.id,
                      typedName: signTypedName,
                      signedByName: signTypedName,
                      signedByCustomerId: signCustomerId,
                      signedByRelationship: signRelationship,
                      signedByStaffId: activeStaff?.id,
                      updatedByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : undefined
                    });
                    setFeedback(result.message);
                  }}>Mark Waiver Signed</Button>
                </article>
              </>
            ) : (
              <article className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Select a waiver template to view details.</article>
            )}
          </section>
        </div>
      </section>
    </PermissionGate>
  );
}
