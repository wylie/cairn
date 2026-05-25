"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { FormField, FormGrid, SelectInput, TextInput, TextareaInput } from "@/components/shared/form-layout";

type AccessType = "day-pass" | "membership" | "punch-pass" | "custom";
type DurationType = "today" | "days" | "date" | "unlimited";
type ReasonType = "staff_comp" | "guest_pass" | "service_recovery" | "promo" | "other";

export interface GrantCompAccessInput {
  accessType: AccessType;
  durationType: DurationType;
  durationDays?: number;
  expirationDate?: string;
  reason: ReasonType;
  notes?: string;
}

const ACCESS_TYPE_LABELS: Record<AccessType, string> = {
  "day-pass": "Day Pass",
  membership: "Membership",
  "punch-pass": "Punch Pass",
  custom: "Custom access"
};

const REASON_LABELS: Record<ReasonType, string> = {
  staff_comp: "Staff comp",
  guest_pass: "Guest pass",
  service_recovery: "Service recovery",
  promo: "Promo",
  other: "Other"
};

export function GrantCompAccessModal({
  open,
  customerName,
  onClose,
  onSubmit
}: {
  open: boolean;
  customerName: string;
  onClose: () => void;
  onSubmit: (input: GrantCompAccessInput) => { ok: boolean; message: string };
}) {
  const [accessType, setAccessType] = useState<AccessType>("day-pass");
  const [durationType, setDurationType] = useState<DurationType>("today");
  const [durationDays, setDurationDays] = useState("7");
  const [expirationDate, setExpirationDate] = useState("");
  const [reason, setReason] = useState<ReasonType>("staff_comp");
  const [notes, setNotes] = useState("");
  const [warning, setWarning] = useState("");

  useEffect(() => {
    if (!open) return;
    setAccessType("day-pass");
    setDurationType("today");
    setDurationDays("7");
    setExpirationDate("");
    setReason("staff_comp");
    setNotes("");
    setWarning("");
  }, [open]);

  if (!open) return null;

  const submit = () => {
    const parsedDays = Number(durationDays);
    const input: GrantCompAccessInput = {
      accessType,
      durationType,
      durationDays: durationType === "days" && Number.isFinite(parsedDays) && parsedDays > 0 ? Math.round(parsedDays) : undefined,
      expirationDate: durationType === "date" ? expirationDate : undefined,
      reason,
      notes: notes.trim() || undefined
    };

    if (durationType === "days" && !input.durationDays) {
      setWarning("Enter a valid number of days.");
      return;
    }
    if (durationType === "date" && !expirationDate) {
      setWarning("Select an expiration date.");
      return;
    }

    const result = onSubmit(input);
    if (!result.ok) {
      setWarning(result.message);
      return;
    }
    onClose();
  };

  return (
    <ModalShell
      open={open}
      ariaLabel="Grant Comp Access"
      title="Grant Comp Access"
      description={customerName}
      onClose={onClose}
      maxWidthClassName="max-w-2xl"
      footer={
        <div className="space-y-2">
          {warning ? <p role="alert" className="text-sm text-amber-800">{warning}</p> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="caution" onClick={submit}>Grant Access</Button>
          </div>
        </div>
      }
    >
      <FormGrid className="sm:grid-cols-2">
          <FormField label="Access type">
            <SelectInput aria-label="Comp access type" value={accessType} onChange={(event) => setAccessType(event.target.value as AccessType)}>
              {Object.entries(ACCESS_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </SelectInput>
          </FormField>
          <FormField label="Duration">
            <SelectInput aria-label="Comp duration" value={durationType} onChange={(event) => setDurationType(event.target.value as DurationType)}>
              <option value="today">Today only</option>
              <option value="days">X days</option>
              <option value="date">Expiration date</option>
              <option value="unlimited">Unlimited</option>
            </SelectInput>
          </FormField>

          {durationType === "days" ? (
            <FormField label="Number of days">
              <TextInput aria-label="Comp duration days" type="number" min={1} value={durationDays} onChange={(event) => setDurationDays(event.target.value)} />
            </FormField>
          ) : null}
          {durationType === "date" ? (
            <FormField label="Expiration date">
              <TextInput aria-label="Comp expiration date" type="date" value={expirationDate} onChange={(event) => setExpirationDate(event.target.value)} />
            </FormField>
          ) : null}

          <FormField label="Reason" className="sm:col-span-2">
            <SelectInput aria-label="Comp reason" value={reason} onChange={(event) => setReason(event.target.value as ReasonType)}>
              {Object.entries(REASON_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </SelectInput>
          </FormField>
          <FormField label="Notes (optional)" className="sm:col-span-2">
            <TextareaInput aria-label="Comp notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </FormField>
      </FormGrid>
    </ModalShell>
  );
}
