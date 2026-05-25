"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModalShell } from "@/components/ui/modal-shell";
import { FormField, FormGrid } from "@/components/shared/form-layout";
import { SearchInput } from "@/components/shared/search-input";
import type { Customer, CustomerRelationshipType } from "@/types/domain";

const RELATIONSHIP_OPTIONS: Array<{ value: CustomerRelationshipType; label: string }> = [
  { value: "parent_guardian", label: "Parent/guardian" },
  { value: "child", label: "Child" },
  { value: "spouse_partner", label: "Spouse/partner" },
  { value: "sibling", label: "Sibling" },
  { value: "emergency_contact", label: "Emergency contact" },
  { value: "other", label: "Other" }
];

type NewCustomerInput = {
  firstName: string;
  lastName: string;
  preferredName?: string;
  pronouns?: string;
  customPronouns?: string;
  dateOfBirth?: string;
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
  waiverStatus?: "valid" | "missing" | "expired";
  waiverSignedToday?: boolean;
  relatedCustomerId?: string;
  relationshipType?: CustomerRelationshipType;
  relationshipNotes?: string;
};

export function AddCustomerModal({
  open,
  onClose,
  onCreate,
  title = "New Customer",
  customers = [],
  autoCloseOnSuccess = false,
  onCreated,
  quickActions
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: NewCustomerInput) => { ok: boolean; message: string; customerId?: string };
  title?: string;
  customers?: Customer[];
  autoCloseOnSuccess?: boolean;
  onCreated?: (customerId: string, input: NewCustomerInput) => void;
  quickActions?: {
    onSellAccess?: (customerId: string) => void;
    onCheckIn?: (customerId: string) => void;
    onMarkWaiverSigned?: (customerId: string) => void;
    onViewProfile?: (customerId: string) => void;
    onAddFamilyMember?: (customerId: string) => void;
  };
}) {
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [pronouns, setPronouns] = useState("They/them");
  const [customPronouns, setCustomPronouns] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const [waiverChoice, setWaiverChoice] = useState<"signed_today" | "on_file" | "needs_waiver">("needs_waiver");
  const [relatedQuery, setRelatedQuery] = useState("");
  const [relatedCustomerId, setRelatedCustomerId] = useState("");
  const [relationshipType, setRelationshipType] = useState<CustomerRelationshipType>("parent_guardian");
  const [relationshipNotes, setRelationshipNotes] = useState("");
  const [warning, setWarning] = useState("");
  const [createdCustomerId, setCreatedCustomerId] = useState<string | null>(null);
  const [createdDisplayName, setCreatedDisplayName] = useState("");

  const steps = ["Identity", "Contact", "Address", "Emergency Contact", "Waiver", "Family/Related"];

  const agePreview = useMemo(() => {
    if (!dateOfBirth) return null;
    const dob = new Date(`${dateOfBirth}T00:00:00Z`);
    if (Number.isNaN(dob.getTime())) return null;
    const today = new Date();
    let age = today.getUTCFullYear() - dob.getUTCFullYear();
    const monthDiff = today.getUTCMonth() - dob.getUTCMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < dob.getUTCDate())) age -= 1;
    return Math.max(age, 0);
  }, [dateOfBirth]);

  const relatedCandidates = useMemo(() => {
    const query = relatedQuery.trim().toLowerCase();
    if (!query) return customers.slice(0, 6);
    return customers
      .filter((customer) => {
        const fullName = `${customer.firstName} ${customer.lastName}`.toLowerCase();
        return (
          fullName.includes(query) ||
          customer.memberId.toLowerCase().includes(query) ||
          customer.phone.toLowerCase().includes(query) ||
          customer.email.toLowerCase().includes(query)
        );
      })
      .slice(0, 8);
  }, [customers, relatedQuery]);

  if (!open) return null;

  const reset = () => {
    setStep(0);
    setFirstName("");
    setLastName("");
    setPreferredName("");
    setPronouns("They/them");
    setCustomPronouns("");
    setDateOfBirth("");
    setPhone("");
    setEmail("");
    setAddressLine1("");
    setAddressLine2("");
    setCity("");
    setState("");
    setPostalCode("");
    setEmergencyContactName("");
    setEmergencyContactPhone("");
    setNotes("");
    setProfilePhotoUrl("");
    setWaiverChoice("needs_waiver");
    setRelatedQuery("");
    setRelatedCustomerId("");
    setRelationshipType("parent_guardian");
    setRelationshipNotes("");
    setWarning("");
    setCreatedCustomerId(null);
    setCreatedDisplayName("");
  };

  const close = () => {
    reset();
    onClose();
  };

  const payload: NewCustomerInput = {
    firstName,
    lastName,
    preferredName,
    pronouns,
    customPronouns: pronouns === "Custom" ? customPronouns : undefined,
    dateOfBirth,
    email,
    phone,
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
    emergencyContactName,
    emergencyContactPhone,
    notes,
    profilePhotoUrl,
    waiverSignedToday: waiverChoice === "signed_today",
    waiverStatus: waiverChoice === "needs_waiver" ? "missing" : "valid",
    relatedCustomerId: relatedCustomerId || undefined,
    relationshipType: relatedCustomerId ? relationshipType : undefined,
    relationshipNotes: relatedCustomerId ? relationshipNotes : undefined
  };

  const submit = () => {
    const result = onCreate(payload);
    if (!result.ok) {
      setWarning(result.message);
      return;
    }
    if (result.customerId) {
      const displayName = `${preferredName.trim() || firstName.trim()} ${lastName.trim()}`.trim();
      setCreatedCustomerId(result.customerId);
      setCreatedDisplayName(displayName);
      onCreated?.(result.customerId, payload);
    }
    setWarning("");
    if (autoCloseOnSuccess) {
      close();
    }
  };

  const validateStep = () => {
    if (step === 0) {
      if (!firstName.trim() || !lastName.trim()) return "First and last name are required.";
      if (!dateOfBirth.trim()) return "Date of birth is required.";
      return "";
    }
    if (step === 1) {
      if (!phone.trim()) return "Phone is required.";
      return "";
    }
    if (step === 2) {
      if (!addressLine1.trim()) return "Address line 1 is required.";
      if (!city.trim()) return "City is required.";
      if (!state.trim()) return "State is required.";
      if (!postalCode.trim()) return "ZIP/postal code is required.";
      return "";
    }
    if (step === 3) {
      if (!emergencyContactName.trim()) return "Emergency contact name is required.";
      if (!emergencyContactPhone.trim()) return "Emergency contact phone is required.";
      return "";
    }
    return "";
  };

  const selectedRelated = relatedCustomerId
    ? customers.find((entry) => entry.id === relatedCustomerId)
    : null;

  const stepContent = () => {
    if (step === 0) {
      return (
        <div className="space-y-3">
          <FormGrid label="new-customer-identity-grid">
            <FormField label="First name">
              <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} aria-label="First name" />
            </FormField>
            <FormField label="Last name">
              <Input value={lastName} onChange={(event) => setLastName(event.target.value)} aria-label="Last name" />
            </FormField>
            <FormField label="Preferred name (optional)">
              <Input value={preferredName} onChange={(event) => setPreferredName(event.target.value)} aria-label="Preferred name" />
            </FormField>
            <FormField label="Pronouns">
              <select aria-label="Pronouns" value={pronouns} onChange={(event) => setPronouns(event.target.value)} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm">
                {[
                  "She/her",
                  "He/him",
                  "They/them",
                  "She/they",
                  "He/they",
                  "Ask me",
                  "Prefer not to say",
                  "Custom"
                ].map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </FormField>
            {pronouns === "Custom" ? (
              <FormField label="Custom pronouns" className="md:col-span-2">
                <Input value={customPronouns} onChange={(event) => setCustomPronouns(event.target.value)} aria-label="Custom pronouns" />
              </FormField>
            ) : null}
            <FormField label="Date of birth" className="md:col-span-2">
              <Input type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} aria-label="Date of birth" />
            </FormField>
          </FormGrid>
          <div className="rounded-md border bg-secondary/50 px-3 py-2 text-sm" aria-label="Age preview">
            {agePreview === null ? "Enter DOB to preview age" : `Age: ${agePreview} years old`}
          </div>
          {agePreview !== null && agePreview < 18 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Minor account, guardian relationship recommended.
            </div>
          ) : null}
        </div>
      );
    }

    if (step === 1) {
      return (
        <FormGrid label="new-customer-contact-grid">
          <FormField label="Phone">
            <Input value={phone} onChange={(event) => setPhone(event.target.value)} aria-label="Phone" />
          </FormField>
          <FormField label="Email (optional)">
            <Input value={email} onChange={(event) => setEmail(event.target.value)} aria-label="Email" />
          </FormField>
        </FormGrid>
      );
    }

    if (step === 2) {
      return (
        <FormGrid label="new-customer-address-grid">
          <FormField label="Address line 1" className="md:col-span-2">
            <Input value={addressLine1} onChange={(event) => setAddressLine1(event.target.value)} aria-label="Address line 1" />
          </FormField>
          <FormField label="Address line 2 (optional)" className="md:col-span-2">
            <Input value={addressLine2} onChange={(event) => setAddressLine2(event.target.value)} aria-label="Address line 2" />
          </FormField>
          <FormField label="City">
            <Input value={city} onChange={(event) => setCity(event.target.value)} aria-label="City" />
          </FormField>
          <FormField label="State">
            <Input value={state} onChange={(event) => setState(event.target.value)} aria-label="State" />
          </FormField>
          <FormField label="ZIP/postal code">
            <Input value={postalCode} onChange={(event) => setPostalCode(event.target.value)} aria-label="ZIP/postal code" />
          </FormField>
        </FormGrid>
      );
    }

    if (step === 3) {
      return (
        <FormGrid label="new-customer-emergency-grid">
          <FormField label="Emergency contact name">
            <Input value={emergencyContactName} onChange={(event) => setEmergencyContactName(event.target.value)} aria-label="Emergency contact name" />
          </FormField>
          <FormField label="Emergency contact phone">
            <Input value={emergencyContactPhone} onChange={(event) => setEmergencyContactPhone(event.target.value)} aria-label="Emergency contact phone" />
          </FormField>
          <FormField label="Profile photo URL (optional)" className="md:col-span-2">
            <Input value={profilePhotoUrl} onChange={(event) => setProfilePhotoUrl(event.target.value)} aria-label="Profile photo URL" />
          </FormField>
          <FormField label="Notes (optional)" className="md:col-span-2">
            <Input value={notes} onChange={(event) => setNotes(event.target.value)} aria-label="Notes" />
          </FormField>
        </FormGrid>
      );
    }

    if (step === 4) {
      return (
        <div className="space-y-2" aria-label="new-customer-waiver-step">
          <label className="flex min-h-11 items-center gap-2 rounded-md border px-3">
            <input
              type="radio"
              name="waiver-choice"
              aria-label="Waiver signed today"
              checked={waiverChoice === "signed_today"}
              onChange={() => setWaiverChoice("signed_today")}
            />
            <span>Waiver signed today</span>
          </label>
          <label className="flex min-h-11 items-center gap-2 rounded-md border px-3">
            <input
              type="radio"
              name="waiver-choice"
              aria-label="Waiver already on file"
              checked={waiverChoice === "on_file"}
              onChange={() => setWaiverChoice("on_file")}
            />
            <span>Waiver already on file</span>
          </label>
          <label className="flex min-h-11 items-center gap-2 rounded-md border px-3">
            <input
              type="radio"
              name="waiver-choice"
              aria-label="Needs waiver"
              checked={waiverChoice === "needs_waiver"}
              onChange={() => setWaiverChoice("needs_waiver")}
            />
            <span>Needs waiver</span>
          </label>
          {waiverChoice === "needs_waiver" ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Customer can be created now. Check-in will remain blocked until waiver is signed.
            </p>
          ) : null}
        </div>
      );
    }

    return (
      <div className="space-y-3" aria-label="new-customer-family-step">
        <SearchInput
          label="Link to existing customer"
          showLabel
          value={relatedQuery}
          onChange={setRelatedQuery}
          placeholder="Search by name, member ID, phone, or email"
        />
        {relatedCandidates.length === 0 ? <p className="text-sm text-muted-foreground">No customers found</p> : (
          <div className="space-y-2">
            {relatedCandidates.map((customer) => {
              const selected = relatedCustomerId === customer.id;
              return (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => setRelatedCustomerId(customer.id)}
                  className={`w-full rounded-md border px-3 py-2 text-left ${selected ? "border-primary bg-secondary" : "border-border hover:bg-secondary/40"}`}
                >
                  <p className="text-sm font-medium">{customer.firstName} {customer.lastName}</p>
                  <p className="text-xs text-muted-foreground">{customer.memberId} • {customer.phone}</p>
                </button>
              );
            })}
          </div>
        )}
        {selectedRelated ? (
          <FormGrid>
            <FormField label="Relationship type">
              <select aria-label="Relationship type" value={relationshipType} onChange={(event) => setRelationshipType(event.target.value as CustomerRelationshipType)} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm">
                {RELATIONSHIP_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </FormField>
            <FormField label="Relationship notes (optional)">
              <Input value={relationshipNotes} onChange={(event) => setRelationshipNotes(event.target.value)} aria-label="Relationship notes" />
            </FormField>
          </FormGrid>
        ) : (
          <p className="text-sm text-muted-foreground">Skip for now, or select a customer to link family/related records.</p>
        )}
      </div>
    );
  };

  if (createdCustomerId && !autoCloseOnSuccess) {
    return (
      <ModalShell
        open={open}
        ariaLabel="New Customer"
        title={`Customer created: ${createdDisplayName}`}
        description="Choose the next action to keep front desk flow moving."
        onClose={close}
        maxWidthClassName="max-w-xl"
        footer={
          <div className="flex justify-end">
            <Button variant="outline" className="min-h-11" onClick={close}>Done</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <Button className="min-h-11" onClick={() => quickActions?.onSellAccess?.(createdCustomerId)}>Sell Access</Button>
            <Button className="min-h-11" onClick={() => quickActions?.onCheckIn?.(createdCustomerId)}>Check In</Button>
            <Button variant="secondary" className="min-h-11" onClick={() => quickActions?.onMarkWaiverSigned?.(createdCustomerId)}>Mark Waiver Signed</Button>
            <Button variant="secondary" className="min-h-11" onClick={() => quickActions?.onViewProfile?.(createdCustomerId)}>View Profile</Button>
            <Button variant="secondary" className="min-h-11 sm:col-span-2" onClick={() => quickActions?.onAddFamilyMember?.(createdCustomerId)}>Add Family Member</Button>
          </div>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell
      open={open}
      ariaLabel="New Customer"
      title={title}
      description={`Step ${step + 1} of ${steps.length}: ${steps[step]}`}
      onClose={close}
      maxWidthClassName="max-w-3xl"
      footer={
        <div className="space-y-2">
          {warning ? <p role="alert" className="text-sm text-amber-800">{warning}</p> : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="outline" className="min-h-11" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0}>
              Back
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="min-h-11" onClick={close}>Cancel</Button>
              {step < steps.length - 1 ? (
                <Button
                  className="min-h-11"
                  onClick={() => {
                    const stepWarning = validateStep();
                    if (stepWarning) {
                      setWarning(stepWarning);
                      return;
                    }
                    setWarning("");
                    setStep((value) => Math.min(steps.length - 1, value + 1));
                  }}
                >
                  Next
                </Button>
              ) : (
                <Button className="min-h-11" onClick={submit}>Create Customer</Button>
              )}
            </div>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-6 gap-1" aria-label="New customer steps">
          {steps.map((label, index) => (
            <div key={label} className={`h-1.5 rounded-full ${index <= step ? "bg-primary" : "bg-secondary"}`} aria-label={`step-${label}`} />
          ))}
        </div>

        <div className="rounded-lg border p-3">{stepContent()}</div>
      </div>
    </ModalShell>
  );
}
