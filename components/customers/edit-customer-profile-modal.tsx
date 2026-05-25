"use client";

import { useEffect, useMemo, useState } from "react";
import type { Customer } from "@/types/domain";
import { FormField, FormGrid } from "@/components/shared/form-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModalShell } from "@/components/ui/modal-shell";
import { isValidUsState, normalizeCity, normalizeStateInput, normalizeStreetAddress } from "@/lib/customer-input-format";

export function EditCustomerProfileModal({
  open,
  customer,
  onClose,
  onSave
}: {
  open: boolean;
  customer: Customer;
  onClose: () => void;
  onSave: (input: {
    firstName: string;
    lastName: string;
    preferredName: string;
    dateOfBirth: string;
    pronouns?: string;
    customPronouns?: string;
    memberId: string;
    email?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    notes?: string;
    profilePhotoUrl?: string;
  }) => { ok: boolean; message: string };
}) {
  const pronounOptions = ["She/her", "He/him", "They/them", "She/they", "He/they", "Ask me", "Prefer not to say", "Custom"] as const;
  const initial = useMemo(
    () => ({
      firstName: customer.firstName ?? "",
      lastName: customer.lastName ?? "",
      preferredName: customer.preferredName ?? customer.firstName ?? "",
      pronouns: customer.pronouns ?? "Prefer not to say",
      customPronouns: customer.customPronouns ?? "",
      memberId: customer.memberId ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      dateOfBirth: customer.dateOfBirth ?? "",
      addressLine1: customer.addressLine1 ?? "",
      addressLine2: customer.addressLine2 ?? "",
      city: customer.city ?? "",
      state: customer.state ?? "",
      postalCode: customer.postalCode ?? "",
      emergencyContactName: customer.emergencyContactName ?? "",
      emergencyContactPhone: customer.emergencyContactPhone ?? "",
      notes: customer.notes ?? "",
      profilePhotoUrl: customer.profilePhotoUrl ?? ""
    }),
    [customer]
  );

  const [form, setForm] = useState(initial);
  const [warning, setWarning] = useState("");
  const normalizedState = normalizeStateInput(form.state);
  const stateInlineError = normalizedState.length === 2 && !isValidUsState(normalizedState) ? "Use a valid 2-letter US state code." : "";

  useEffect(() => {
    if (!open) return;
    setForm(initial);
    setWarning("");
  }, [initial, open]);

  if (!open) return null;

  const submit = () => {
    const normalizedForm = {
      ...form,
      addressLine1: normalizeStreetAddress(form.addressLine1 ?? ""),
      addressLine2: normalizeStreetAddress(form.addressLine2 ?? ""),
      city: normalizeCity(form.city ?? ""),
      state: normalizeStateInput(form.state ?? "")
    };
    if (!isValidUsState(normalizedForm.state)) {
      setWarning("Enter a valid 2-letter US state code.");
      return;
    }
    setForm(normalizedForm);
    const result = onSave(normalizedForm);
    if (!result.ok) {
      setWarning(result.message);
      return;
    }
    setWarning("");
    onClose();
  };

  return (
    <ModalShell
      open={open}
      ariaLabel="Edit Profile"
      title="Edit Profile"
      onClose={onClose}
      maxWidthClassName="max-w-3xl"
      footer={
        <div className="space-y-3">
          {warning ? <p role="alert" className="text-sm text-amber-800">{warning}</p> : null}
          <p className="text-xs text-muted-foreground">
            TODO: Future webcam support will capture/preview/retake profile photo before save.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button className="min-h-11" onClick={submit}>Save Changes</Button>
            <Button className="min-h-11" variant="secondary" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
          <section aria-label="Identity section" className="space-y-2">
            <p className="text-sm font-medium">Identity</p>
            <FormGrid>
              <FormField label="First name">
                <Input aria-label="First name" value={form.firstName} onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))} />
              </FormField>
              <FormField label="Last name">
                <Input aria-label="Last name" value={form.lastName} onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))} />
              </FormField>
              <FormField label="Preferred name">
                <Input aria-label="Preferred name" value={form.preferredName} onChange={(e) => setForm((prev) => ({ ...prev, preferredName: e.target.value }))} />
              </FormField>
              <FormField label="Pronouns">
                <select
                  aria-label="Pronouns"
                  className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm"
                  value={form.pronouns}
                  onChange={(e) => setForm((prev) => ({ ...prev, pronouns: e.target.value }))}
                >
                  {pronounOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </FormField>
              {form.pronouns === "Custom" ? (
                <FormField label="Custom pronouns">
                  <Input aria-label="Custom pronouns" value={form.customPronouns} onChange={(e) => setForm((prev) => ({ ...prev, customPronouns: e.target.value }))} />
                </FormField>
              ) : null}
              <FormField label="Date of birth">
                <Input aria-label="Date of birth" type="date" value={form.dateOfBirth} onChange={(e) => setForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))} />
              </FormField>
              <FormField label="Member ID">
                <Input aria-label="Member ID" value={form.memberId} onChange={(e) => setForm((prev) => ({ ...prev, memberId: e.target.value }))} />
              </FormField>
            </FormGrid>
          </section>

          <section aria-label="Contact section" className="space-y-2">
            <p className="text-sm font-medium">Contact</p>
            <FormGrid>
              <FormField label="Phone">
                <Input aria-label="Phone" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
              </FormField>
              <FormField label="Email (optional)">
                <Input aria-label="Email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
              </FormField>
            </FormGrid>
          </section>

          <section aria-label="Address section" className="space-y-2">
            <p className="text-sm font-medium">Address</p>
            <FormGrid>
              <FormField label="Address line 1">
                <Input
                  aria-label="Address line 1"
                  value={form.addressLine1}
                  onChange={(e) => setForm((prev) => ({ ...prev, addressLine1: e.target.value }))}
                  onBlur={() => setForm((prev) => ({ ...prev, addressLine1: normalizeStreetAddress(prev.addressLine1 ?? "") }))}
                />
              </FormField>
              <FormField label="Address line 2 (optional)">
                <Input
                  aria-label="Address line 2"
                  value={form.addressLine2}
                  onChange={(e) => setForm((prev) => ({ ...prev, addressLine2: e.target.value }))}
                  onBlur={() => setForm((prev) => ({ ...prev, addressLine2: normalizeStreetAddress(prev.addressLine2 ?? "") }))}
                />
              </FormField>
              <FormField label="City">
                <Input
                  aria-label="City"
                  value={form.city}
                  onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                  onBlur={() => setForm((prev) => ({ ...prev, city: normalizeCity(prev.city ?? "") }))}
                />
              </FormField>
              <FormField label="State">
                <Input
                  aria-label="State"
                  value={form.state}
                  maxLength={2}
                  onChange={(e) => setForm((prev) => ({ ...prev, state: normalizeStateInput(e.target.value) }))}
                  onBlur={() => setForm((prev) => ({ ...prev, state: normalizeStateInput(prev.state ?? "") }))}
                />
                {stateInlineError ? <p className="text-xs text-amber-700">{stateInlineError}</p> : null}
              </FormField>
              <FormField label="ZIP/postal code">
                <Input aria-label="ZIP/postal code" value={form.postalCode} onChange={(e) => setForm((prev) => ({ ...prev, postalCode: e.target.value }))} />
              </FormField>
            </FormGrid>
          </section>

          <section aria-label="Emergency Contact section" className="space-y-2">
            <p className="text-sm font-medium">Emergency Contact</p>
            <FormGrid>
              <FormField label="Emergency contact name">
                <Input aria-label="Emergency contact name" value={form.emergencyContactName} onChange={(e) => setForm((prev) => ({ ...prev, emergencyContactName: e.target.value }))} />
              </FormField>
              <FormField label="Emergency contact phone">
                <Input aria-label="Emergency contact phone" value={form.emergencyContactPhone} onChange={(e) => setForm((prev) => ({ ...prev, emergencyContactPhone: e.target.value }))} />
              </FormField>
            </FormGrid>
          </section>

          <section aria-label="Photo section" className="space-y-2">
            <p className="text-sm font-medium">Photo</p>
            <FormField label="Profile photo URL (optional)">
              <Input aria-label="Profile photo URL" value={form.profilePhotoUrl} onChange={(e) => setForm((prev) => ({ ...prev, profilePhotoUrl: e.target.value }))} />
            </FormField>
          </section>

          <section aria-label="Notes section" className="space-y-2">
            <p className="text-sm font-medium">Notes</p>
            <FormField label="Internal notes (optional)">
              <textarea
                aria-label="Notes"
                className="min-h-24 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </FormField>
          </section>
      </div>
    </ModalShell>
  );
}
