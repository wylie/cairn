"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4" role="dialog" aria-modal="true" aria-label="Grant Comp Access">
      <section className="w-full max-w-2xl space-y-4 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Grant Comp Access</h3>
            <p className="text-sm text-muted-foreground">{customerName}</p>
          </div>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span>Access type</span>
            <select
              aria-label="Comp access type"
              className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm"
              value={accessType}
              onChange={(event) => setAccessType(event.target.value as AccessType)}
            >
              {Object.entries(ACCESS_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span>Duration</span>
            <select
              aria-label="Comp duration"
              className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm"
              value={durationType}
              onChange={(event) => setDurationType(event.target.value as DurationType)}
            >
              <option value="today">Today only</option>
              <option value="days">X days</option>
              <option value="date">Expiration date</option>
              <option value="unlimited">Unlimited</option>
            </select>
          </label>

          {durationType === "days" ? (
            <label className="space-y-1 text-sm">
              <span>Number of days</span>
              <Input
                aria-label="Comp duration days"
                type="number"
                min={1}
                value={durationDays}
                onChange={(event) => setDurationDays(event.target.value)}
              />
            </label>
          ) : null}
          {durationType === "date" ? (
            <label className="space-y-1 text-sm">
              <span>Expiration date</span>
              <Input
                aria-label="Comp expiration date"
                type="date"
                value={expirationDate}
                onChange={(event) => setExpirationDate(event.target.value)}
              />
            </label>
          ) : null}

          <label className="space-y-1 text-sm sm:col-span-2">
            <span>Reason</span>
            <select
              aria-label="Comp reason"
              className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm"
              value={reason}
              onChange={(event) => setReason(event.target.value as ReasonType)}
            >
              {Object.entries(REASON_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span>Notes (optional)</span>
            <textarea
              aria-label="Comp notes"
              className="min-h-24 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
        </div>

        {warning ? <p role="alert" className="text-sm text-amber-800">{warning}</p> : null}

        <footer className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="caution" onClick={submit}>Grant Access</Button>
        </footer>
      </section>
    </div>
  );
}

