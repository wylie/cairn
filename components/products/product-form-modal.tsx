"use client";

import { useEffect, useState } from "react";
import { useRef } from "react";
import type { PosProduct } from "@/types/domain";
import type { ProductCategoryRecord } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModalShell } from "@/components/ui/modal-shell";
import { CheckboxField, FormField, FormGrid, SelectInput } from "@/components/shared/form-layout";
import {
  colorTokenLabels,
  colorTokenTone,
  defaultCategoryColor,
  mapTypeToCategory,
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
      displayType: "Day Passes",
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
  onSubmit,
  categories = []
}: {
  open: boolean;
  title: string;
  product?: PosProduct | null;
  onClose: () => void;
  onSubmit: (input: ProductFormInput) => { ok: boolean; message: string };
  categories?: ProductCategoryRecord[];
}) {
  const [form, setForm] = useState<ProductFormInput>(() => toFormState(product));
  const [error, setError] = useState("");
  const [colorAuto, setColorAuto] = useState(!product?.colorToken);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(toFormState(product));
    setError("");
    setColorAuto(!product?.colorToken);
  }, [open, product]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }, 0);
    return () => clearTimeout(timer);
  }, [open]);

  if (!open) return null;

  const isPunchPass = form.category === "punch_passes" || form.type === "punch-pass";
  const isDayPass = form.category === "day_passes";
  const isMembership = form.category === "memberships" || form.type === "membership";

  const sortedCategories = [...categories]
    .filter((entry) => entry.active)
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const hasCategory = sortedCategories.some((entry) => entry.key === form.category);

  const submit = () => {
    const result = onSubmit(form);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onClose();
  };

  return (
    <ModalShell
      open={open}
      ariaLabel={title}
      title={title}
      onClose={onClose}
      maxWidthClassName="max-w-2xl"
      footer={
        <div className="space-y-2">
          {error ? <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button onClick={submit}>Save Product</Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      }
    >
      <FormGrid data-testid="product-form-grid">
          <p className="md:col-span-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Overview</p>
          <FormField label="Name">
            <Input
              ref={nameInputRef}
              aria-label="Product name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </FormField>

          <FormField label="Price">
            <Input aria-label="Product price" type="number" min="0" step="0.01" value={String(form.price)} onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))} />
          </FormField>

          <FormField label="Description" className="md:col-span-2">
            <Input aria-label="Product description" value={form.description ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
          </FormField>

          <FormField label="Type">
            <SelectInput
              aria-label="Product type"
              value={form.type}
              onChange={(event) =>
                setForm((prev) => {
                  const type = event.target.value as NonNullable<PosProduct["type"]>;
                  const mapped = mapTypeToCategory(type);
                  if (!colorAuto) return { ...prev, type, category: mapped };
                  const suggested = defaultCategoryColor[mapped];
                  return { ...prev, type, category: mapped, colorToken: suggested, colorLabel: colorTokenLabels[suggested] };
                })
              }
            >
              {productTypeOptions.map((option) => (
                <option key={option} value={option}>{typeLabels[option]}</option>
              ))}
            </SelectInput>
          </FormField>
          <FormField label="Category">
            <SelectInput
              aria-label="Product category"
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
            >
              {sortedCategories.map((category) => (
                <option key={category.id} value={category.key}>{category.label}</option>
              ))}
            </SelectInput>
            {!hasCategory ? <p className="text-xs text-amber-700">Uncategorized product. Select a category for reporting.</p> : null}
          </FormField>
          <FormField label="Display group">
            <Input
              aria-label="Product display type"
              placeholder="Memberships, Youth Programs, MTB"
              value={form.displayType ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, displayType: event.target.value }))}
            />
          </FormField>
          <FormField label="Tags">
            <Input
              aria-label="Product tags"
              placeholder="Youth, Climbing, Camp"
              value={(form.tags ?? []).join(", ")}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  tags: event.target.value
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean)
                }))
              }
            />
          </FormField>

          <FormField label="Access behavior">
            <SelectInput
              aria-label="Product access behavior"
              value={form.accessBehavior ?? "single_entry"}
              onChange={(event) => setForm((prev) => ({ ...prev, accessBehavior: event.target.value as NonNullable<PosProduct["accessBehavior"]> }))}
            >
              {accessBehaviorOptions.map((option) => (
                <option key={option} value={option}>{option.replace(/_/g, " ")}</option>
              ))}
            </SelectInput>
          </FormField>
          <p className="md:col-span-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Access Rules</p>
          <CheckboxField
            label="Household eligible"
            checked={Boolean(form.householdEligible)}
            onChange={(next) => setForm((prev) => ({ ...prev, householdEligible: next }))}
          />
          <CheckboxField
            label="Guardian required"
            checked={Boolean(form.guardianRequired)}
            onChange={(next) => setForm((prev) => ({ ...prev, guardianRequired: next }))}
          />
          <CheckboxField
            label="Simultaneous access allowed"
            checked={Boolean(form.simultaneousAccessAllowed)}
            onChange={(next) => setForm((prev) => ({ ...prev, simultaneousAccessAllowed: next }))}
          />
          <CheckboxField
            label="Taxable"
            checked={Boolean(form.taxable)}
            onChange={(next) => setForm((prev) => ({ ...prev, taxable: next }))}
          />
          <label className="space-y-1 text-sm">
            <span>Minimum age</span>
            <Input aria-label="Minimum age" type="number" min="0" value={form.minimumAge ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, minimumAge: event.target.value ? Number(event.target.value) : undefined }))} />
          </label>
          <label className="space-y-1 text-sm">
            <span>Maximum age</span>
            <Input aria-label="Maximum age" type="number" min="0" value={form.maximumAge ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, maximumAge: event.target.value ? Number(event.target.value) : undefined }))} />
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
          <FormField label="Internal notes" className="md:col-span-2">
            <Input aria-label="Product internal notes" value={form.internalNotes ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, internalNotes: event.target.value }))} />
          </FormField>

          <CheckboxField
            label="Show as quick button"
            checked={Boolean(form.showAsQuickButton)}
            onChange={(next) => setForm((prev) => ({ ...prev, showAsQuickButton: next }))}
          />

          <CheckboxField
            label="Active"
            checked={form.active !== false}
            onChange={(next) => setForm((prev) => ({ ...prev, active: next }))}
          />

          <CheckboxField
            label="Requires waiver"
            checked={Boolean(form.waiverRequired)}
            onChange={(next) => setForm((prev) => ({ ...prev, waiverRequired: next }))}
          />
        </FormGrid>

    </ModalShell>
  );
}
