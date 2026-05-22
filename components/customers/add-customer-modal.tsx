"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AddCustomerModal({
  open,
  onClose,
  onCreate,
  title = "Add Customer"
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: { firstName: string; lastName: string; email?: string; phone?: string }) => { ok: boolean; message: string; customerId?: string };
  title?: string;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [warning, setWarning] = useState("");

  if (!open) return null;

  const submit = () => {
    const result = onCreate({ firstName, lastName, email, phone });
    if (!result.ok) {
      setWarning(result.message);
      return;
    }
    setWarning("");
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4" role="dialog" aria-modal="true" aria-label="Add Customer">
      <div className="w-full max-w-lg space-y-4 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span>First name</span>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} aria-label="First name" />
          </label>
          <label className="space-y-1 text-sm">
            <span>Last name</span>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} aria-label="Last name" />
          </label>
          <label className="space-y-1 text-sm">
            <span>Email (optional)</span>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
          </label>
          <label className="space-y-1 text-sm">
            <span>Phone (optional)</span>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Phone" />
          </label>
        </div>

        {warning ? <p role="alert" className="text-sm text-amber-800">{warning}</p> : null}

        <div className="flex flex-wrap gap-2">
          <Button className="min-h-11" onClick={submit}>Create Customer</Button>
          <Button className="min-h-11" variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
