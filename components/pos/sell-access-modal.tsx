"use client";

import { useMemo, useState } from "react";
import type { Customer, PosProduct, PosTransaction } from "@/types/domain";
import { AccessProductPicker } from "@/components/pos/access-product-picker";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { ProductPriceLabel } from "@/components/pos/product-price-label";
import { MockReceiptPanel } from "@/components/pos/mock-receipt-panel";

export function SellAccessModal({
  open,
  onClose,
  customer,
  products,
  canUsePOS,
  canOverrideAccess,
  onSubmit
}: {
  open: boolean;
  onClose: () => void;
  customer: Customer;
  products: PosProduct[];
  canUsePOS: boolean;
  canOverrideAccess: boolean;
  onSubmit: (payload: { productIds: string[]; checkInAfterSale: boolean }) => { ok: boolean; message: string; transaction?: PosTransaction | null };
}) {
  const [cart, setCart] = useState<string[]>([]);
  const [warning, setWarning] = useState("");
  const [feedback, setFeedback] = useState("");
  const [receipt, setReceipt] = useState<PosTransaction | null>(null);

  const cartProducts = useMemo(
    () =>
      cart
        .map((productId) => products.find((product) => product.id === productId))
        .filter((product): product is PosProduct => Boolean(product)),
    [products, cart]
  );
  const subtotal = cartProducts.reduce((sum, item) => sum + item.priceCents, 0);

  if (!open) return null;

  const submit = (checkInAfterSale: boolean) => {
    if (!canUsePOS) {
      setWarning("You do not have permission to perform this action.");
      return;
    }
    const includesComp = cartProducts.some((product) => product.type === "comp" || product.category === "comps");
    if (includesComp && !canOverrideAccess) {
      setWarning("You do not have permission to perform this action.");
      return;
    }

    const result = onSubmit({ productIds: cart, checkInAfterSale });
    if (!result.ok) {
      setWarning(result.message);
      setFeedback("");
      return;
    }

    setWarning("");
    setFeedback(result.message);
    setReceipt(result.transaction ?? null);
    setCart([]);
  };

  return (
    <ModalShell
      open={open}
      ariaLabel="Sell Access"
      title={`Sell Access for ${customer.firstName} ${customer.lastName}`}
      onClose={onClose}
      maxWidthClassName="max-w-3xl"
      footer={
        <div className="space-y-2">
          {feedback ? <p role="status" className="text-sm text-emerald-800">{feedback}</p> : null}
          {warning ? <p role="alert" className="text-sm text-amber-800">{warning}</p> : null}
        </div>
      }
    >
      <div className="space-y-4">
        <AccessProductPicker products={products} onAdd={(id) => setCart((prev) => [...prev, id])} disableStaffComp={!canOverrideAccess} />

        <div className="rounded-lg border bg-card p-3">
          <p className="font-medium">Cart</p>
          {cartProducts.length === 0 ? <p className="text-sm text-muted-foreground">No access products selected.</p> : null}
          <div className="mt-2 space-y-2">
            {cartProducts.map((item, index) => (
              <div key={`${item.id}-${index}`} className="flex items-center justify-between text-sm">
                <span>{item.name}</span>
                <div className="flex items-center gap-2">
                  <ProductPriceLabel cents={item.priceCents} />
                  <button
                    aria-label={`Remove ${item.name}`}
                    className="text-xs text-muted-foreground"
                    onClick={() => setCart((prev) => prev.filter((_, i) => i !== index))}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t pt-2">
            <span className="text-sm text-muted-foreground">Subtotal</span>
            <ProductPriceLabel cents={subtotal} />
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <Button variant="outline" className="min-h-11" onClick={() => setCart([])}>Clear</Button>
            <Button className="min-h-11" onClick={() => submit(false)}>Complete</Button>
            <Button className="min-h-11 min-w-0 px-3 text-center leading-tight whitespace-normal" onClick={() => submit(true)}>Complete + Check In</Button>
          </div>
        </div>

        <MockReceiptPanel transaction={receipt} />
      </div>
    </ModalShell>
  );
}
