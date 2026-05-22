"use client";

import { useMemo, useState } from "react";
import type { Customer, PosProduct, PosTransaction } from "@/types/domain";
import { AccessProductPicker } from "@/components/pos/access-product-picker";
import { Button } from "@/components/ui/button";
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

  const cartProducts = useMemo(() => products.filter((product) => cart.includes(product.id)), [products, cart]);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4" role="dialog" aria-modal="true" aria-label="Sell Access">
      <div className="w-full max-w-3xl rounded-xl border bg-card p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Sell Access for {customer.firstName} {customer.lastName}</h3>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>

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
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" className="min-h-11" onClick={() => setCart([])}>Clear</Button>
            <Button className="min-h-11" onClick={() => submit(false)}>Complete</Button>
            <Button className="min-h-11 whitespace-normal text-center" onClick={() => submit(true)}>Complete + Check In</Button>
          </div>
        </div>

        {feedback ? <p role="status" className="text-sm text-emerald-800">{feedback}</p> : null}
        {warning ? <p role="alert" className="text-sm text-amber-800">{warning}</p> : null}
        <MockReceiptPanel transaction={receipt} />
      </div>
    </div>
  );
}
