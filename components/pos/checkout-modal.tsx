"use client";

import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { CheckboxField, FormField, SelectInput } from "@/components/shared/form-layout";

export function CheckoutModal({
  open,
  totalLabel,
  paymentMethod,
  onPaymentMethodChange,
  emailReceipt,
  onEmailReceiptChange,
  printReceipt,
  onPrintReceiptChange,
  canComplete,
  helperText,
  onClose,
  onComplete
}: {
  open: boolean;
  totalLabel: string;
  paymentMethod: "card" | "cash" | "comp" | "gift_card" | "account_credit";
  onPaymentMethodChange: (method: "card" | "cash" | "comp" | "gift_card" | "account_credit") => void;
  emailReceipt: boolean;
  onEmailReceiptChange: (value: boolean) => void;
  printReceipt: boolean;
  onPrintReceiptChange: (value: boolean) => void;
  canComplete: boolean;
  helperText?: string;
  onClose: () => void;
  onComplete: () => void;
}) {
  if (!open) return null;

  return (
    <ModalShell
      open={open}
      ariaLabel="Checkout"
      title="Checkout"
      description="Complete this sale and activate access products."
      onClose={onClose}
      maxWidthClassName="max-w-lg"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" className="min-h-11" onClick={onClose}>Cancel</Button>
          <Button className="min-h-11" disabled={!canComplete} onClick={onComplete}>
            Complete Sale
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg border bg-secondary/30 px-3 py-2">
          <p className="text-sm text-muted-foreground">Amount to charge</p>
          <p className="text-2xl font-semibold">{totalLabel}</p>
        </div>

        <FormField label="Payment method">
          <SelectInput
            id="checkout-payment-method"
            aria-label="Checkout payment method"
            value={paymentMethod}
            onChange={(event) => onPaymentMethodChange(event.target.value as "card" | "cash" | "comp" | "gift_card" | "account_credit")}
          >
            <option value="card">Card</option>
            <option value="cash">Cash</option>
            <option value="comp">Comp</option>
            <option value="gift_card">Gift Card (placeholder)</option>
            <option value="account_credit">Account Credit (placeholder)</option>
          </SelectInput>
        </FormField>

        <fieldset className="space-y-2">
          <legend className="text-sm text-muted-foreground">Receipt options</legend>
          <CheckboxField label="Email receipt" checked={emailReceipt} onChange={onEmailReceiptChange} />
          <CheckboxField label="Print receipt (placeholder)" checked={printReceipt} onChange={onPrintReceiptChange} />
        </fieldset>

        {helperText ? <p className="text-sm text-muted-foreground">{helperText}</p> : null}
      </div>
    </ModalShell>
  );
}
