"use client";

import { useEffect, useState } from "react";
import type { PosProduct } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  categoryLabels,
  colorTokenLabels,
  colorTokenTone,
  defaultCategoryColor,
  productCategoryOptions,
  productColorTokens,
  productTypeOptions,
  typeLabels
} from "@/lib/products/catalog";

type ProductFormInput = Omit<PosProduct, "id" | "organizationId"> & { price: string | number };

const accessBehaviorOptions: Array<NonNullable<PosProduct["accessBehavior"]>> = [
  "single_entry",
  "punch_decrement",
  "recurring_membership",
  "registration_access",
  "manual_comp"
];

function toFormState(product?: PosProduct | null): ProductFormInput {
  if (!product) {
    return {
      name: "",
      description: "",
      category: "day_passes",
      type: "access",
      price: "",
      priceCents: 0,
      active: true,
      showAsQuickButton: false,
      accessBehavior: "single_entry",
      waiverRequired: true,
      validDays: undefined,
      punchQuantity: undefined,
      expirationDays: undefined,
      colorToken: "blue",
      colorLabel: "Blue",
      categoryColorToken: "blue"
    };
  }

  return {
    ...product,
    price: (product.priceCents / 100).toFixed(2)
  };
}

export function ProductFormModal({
  open,
  title,
  product,
  onClose,
  onSubmit
}: {
  open: boolean;
  title: string;
  product?: PosProduct | null;
  onClose: () => void;
  onSubmit: (input: ProductFormInput) => { ok: boolean; message: string };
}) {
  const [form, setForm] = useState<ProductFormInput>(() => toFormState(product));
  const [error, setError] = useState("");
  const [colorAuto, setColorAuto] = useState(!product?.colorToken);

  useEffect(() => {
    if (!open) return;
    setForm(toFormState(product));
    setError("");
    setColorAuto(!product?.colorToken);
  }, [open, product]);

  if (!open) return null;

  const isPunchPass = form.category === "punch_passes" || form.type === "punch-pass";
  const isDayPass = form.category === "day_passes";
  const isMembership = form.category === "memberships" || form.type === "membership";

  const ToggleField = ({
    label,
    checked,
    onChange
  }: {
    label: string;
    checked: boolean;
    onChange: (next: boolean) => void;
  }) => (
    <label className="space-y-1 text-sm">
      <span className="text-sm text-muted-foreground">Option</span>
      <span className="flex h-11 items-center gap-2 rounded-md border border-input bg-white px-3">
        <input aria-label={label} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        <span>{label}</span>
      </span>
    </label>
  );

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4">
      <div className="w-full max-w-2xl rounded-xl border bg-card p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>

        <div data-testid="product-form-grid" className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span>Name</span>
            <Input aria-label="Product name" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
          </label>

          <label className="space-y-1 text-sm">
            <span>Price</span>
            <Input aria-label="Product price" type="number" min="0" step="0.01" value={String(form.price)} onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))} />
          </label>

          <label className="space-y-1 text-sm md:col-span-2">
            <span>Description</span>
            <Input aria-label="Product description" value={form.description ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
          </label>

          <label className="space-y-1 text-sm">
            <span>Category</span>
            <select
              aria-label="Product category"
              value={form.category}
              onChange={(event) =>
                setForm((prev) => {
                  const nextCategory = event.target.value as PosProduct["category"];
                  if (!colorAuto) return { ...prev, category: nextCategory };
                  const suggested = defaultCategoryColor[nextCategory];
                  return { ...prev, category: nextCategory, colorToken: suggested, colorLabel: colorTokenLabels[suggested] };
                })
              }
              className="flex h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
            >
              {productCategoryOptions.map((option) => (
                <option key={option} value={option}>{categoryLabels[option]}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span>Type</span>
            <select
              aria-label="Product type"
              value={form.type}
              onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as NonNullable<PosProduct["type"]> }))}
              className="flex h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
            >
              {productTypeOptions.map((option) => (
                <option key={option} value={option}>{typeLabels[option]}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span>Access behavior</span>
            <select
              aria-label="Product access behavior"
              value={form.accessBehavior ?? "single_entry"}
              onChange={(event) => setForm((prev) => ({ ...prev, accessBehavior: event.target.value as NonNullable<PosProduct["accessBehavior"]> }))}
              className="flex h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
            >
              {accessBehaviorOptions.map((option) => (
                <option key={option} value={option}>{option.replace(/_/g, " ")}</option>
              ))}
            </select>
          </label>

          <div className="space-y-1 text-sm md:col-span-2">
            <span>Product color</span>
            <div className="grid gap-2 sm:grid-cols-4">
              {productColorTokens.map((token) => {
                const selected = form.colorToken === token;
                return (
                  <button
                    key={token}
                    type="button"
                    aria-label={`Product color ${colorTokenLabels[token]}`}
                    onClick={() => {
                      setColorAuto(false);
                      setForm((prev) => ({ ...prev, colorToken: token, colorLabel: colorTokenLabels[token] }));
                    }}
                    className={`flex h-11 items-center justify-center rounded-md border text-sm ${colorTokenTone[token]} ${
                      selected ? "ring-2 ring-ring ring-offset-1" : ""
                    }`}
                  >
                    {colorTokenLabels[token]}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">Selected: {colorTokenLabels[(form.colorToken ?? "blue") as keyof typeof colorTokenLabels]}</p>
          </div>

          {isPunchPass ? (
            <label className="space-y-1 text-sm">
              <span>Punch quantity</span>
              <Input aria-label="Punch quantity" type="number" min="1" value={form.punchQuantity ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, punchQuantity: event.target.value ? Number(event.target.value) : undefined }))} />
            </label>
          ) : null}

          {isDayPass ? (
            <label className="space-y-1 text-sm">
              <span>Valid days</span>
              <Input aria-label="Valid days" type="number" min="1" value={form.validDays ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, validDays: event.target.value ? Number(event.target.value) : undefined }))} />
            </label>
          ) : null}

          {isMembership ? (
            <label className="space-y-1 text-sm">
              <span>Expiration days (placeholder)</span>
              <Input aria-label="Expiration days" type="number" min="1" value={form.expirationDays ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, expirationDays: event.target.value ? Number(event.target.value) : undefined }))} />
            </label>
          ) : null}

          <ToggleField
            label="Show as quick button"
            checked={Boolean(form.showAsQuickButton)}
            onChange={(next) => setForm((prev) => ({ ...prev, showAsQuickButton: next }))}
          />

          <ToggleField
            label="Active"
            checked={form.active !== false}
            onChange={(next) => setForm((prev) => ({ ...prev, active: next }))}
          />

          <ToggleField
            label="Requires waiver"
            checked={Boolean(form.waiverRequired)}
            onChange={(next) => setForm((prev) => ({ ...prev, waiverRequired: next }))}
          />
        </div>

        {error ? <p role="alert" className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</p> : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            onClick={() => {
              const result = onSubmit(form);
              if (!result.ok) {
                setError(result.message);
                return;
              }
              onClose();
            }}
          >
            Save Product
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
