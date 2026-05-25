"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { ProductPriceLabel } from "@/components/pos/product-price-label";
import { SearchInput } from "@/components/shared/search-input";
import { categoryLabels, getProductCategory, getProductToneClass } from "@/lib/products/catalog";
import { useCustomerState } from "@/lib/state/customer-state";

export function QuickButtonLayoutModal({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { accessProducts, updateProduct, reorderQuickButtonProduct } = useCustomerState();
  const [query, setQuery] = useState("");

  const activeProducts = useMemo(() => accessProducts.filter((product) => product.active !== false), [accessProducts]);
  const quickButtons = useMemo(
    () =>
      activeProducts
        .filter((product) => product.showAsQuickButton)
        .sort((a, b) => (a.quickButtonRank ?? 999) - (b.quickButtonRank ?? 999)),
    [activeProducts]
  );
  const availableProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return activeProducts
      .filter((product) => !product.showAsQuickButton)
      .filter((product) => {
        if (!q) return true;
        return [product.name, product.description ?? "", categoryLabels[getProductCategory(product)]]
          .join(" ")
          .toLowerCase()
          .includes(q);
      });
  }, [activeProducts, query]);

  if (!open) return null;

  return (
    <ModalShell
      open={open}
      ariaLabel="Customize Quick Buttons"
      title="Customize Quick Buttons"
      description="Manage which products appear first in POS quick actions."
      onClose={onClose}
      maxWidthClassName="max-w-5xl"
      footer={
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>Done</Button>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
          <section className="space-y-2 rounded-lg border p-3">
            <p className="text-sm font-medium">Available Products</p>
            <SearchInput
              value={query}
              onChange={setQuery}
              label="Search available products"
              placeholder="Search products"
            />
            <div className="space-y-2">
              {availableProducts.map((product) => (
                <div key={product.id} className={`flex items-center justify-between rounded-md border px-3 py-2 ${getProductToneClass(product)}`}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{categoryLabels[getProductCategory(product)]}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => updateProduct(product.id, { ...product, price: (product.priceCents / 100).toFixed(2), showAsQuickButton: true })}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add
                  </Button>
                </div>
              ))}
              {availableProducts.length === 0 ? <p className="text-sm text-muted-foreground">No matching products.</p> : null}
            </div>
          </section>

          <section className="space-y-2 rounded-lg border p-3 lg:col-span-2">
            <p className="text-sm font-medium">Active Quick Buttons</p>
            <div className="space-y-2">
              {quickButtons.map((product, index) => (
                <div
                  key={product.id}
                  className={`flex items-center justify-between rounded-md border px-3 py-2 ${getProductToneClass(product)}`}
                  data-testid="quick-layout-item"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{categoryLabels[getProductCategory(product)]}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ProductPriceLabel cents={product.priceCents} />
                    <Button size="sm" variant="ghost" disabled={index === 0} onClick={() => reorderQuickButtonProduct(product.id, "up")}>
                      <ArrowUp className="h-4 w-4" />
                      <span className="sr-only">Move up</span>
                    </Button>
                    <Button size="sm" variant="ghost" disabled={index === quickButtons.length - 1} onClick={() => reorderQuickButtonProduct(product.id, "down")}>
                      <ArrowDown className="h-4 w-4" />
                      <span className="sr-only">Move down</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => updateProduct(product.id, { ...product, price: (product.priceCents / 100).toFixed(2), showAsQuickButton: false })}
                    >
                      <X className="mr-1 h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              {quickButtons.length === 0 ? <p className="text-sm text-muted-foreground">No quick buttons configured.</p> : null}
            </div>
            <div className="rounded-md border bg-secondary/20 p-3">
              <p className="mb-2 text-sm font-medium">Live Preview</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {quickButtons.map((product) => (
                  <div key={product.id} className="rounded-md border bg-card px-3 py-2 text-sm font-medium">
                    {product.name}
                  </div>
                ))}
              </div>
            </div>
          </section>
      </div>
    </ModalShell>
  );
}
