"use client";

import { useMemo, useState } from "react";
import { ProductFormModal } from "@/components/products/product-form-modal";
import { FormField } from "@/components/shared/form-layout";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { StaffSwitcher } from "@/components/staff/staff-switcher";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductPriceLabel } from "@/components/pos/product-price-label";
import { categoryLabels, getProductCategory, getProductToneClass, resolveProductColorToken, typeLabels } from "@/lib/products/catalog";
import { useCustomerState } from "@/lib/state/customer-state";
import { useWorkstationState } from "@/lib/state/workstation-state";
import type { PosProduct } from "@/types/domain";

type FilterCategory = "all" | PosProduct["category"];

export default function ProductsPage() {
  const { accessProducts, createProduct, updateProduct, toggleProductActive } = useCustomerState();
  const { hasPermission } = useWorkstationState();

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editingProduct, setEditingProduct] = useState<PosProduct | null>(null);
  const [feedback, setFeedback] = useState("");

  const canManageProducts = hasPermission("manageProducts");

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accessProducts.filter((product) => {
      const category = getProductCategory(product);
      const categoryMatch = categoryFilter === "all" || categoryFilter === category;
      if (!categoryMatch) return false;
      if (!q) return true;

      const haystack = [
        product.name,
        product.description ?? "",
        categoryLabels[category],
        product.type ? typeLabels[product.type] : "",
        product.accessBehavior ?? ""
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [accessProducts, categoryFilter, query]);

  return (
    <section className="space-y-4">
      <PageHeader
        title="Products"
        description="Create and manage sellable products for POS, access, and registration workflows."
        actions={
          <Button onClick={() => setShowCreate(true)} disabled={!canManageProducts}>
            Add Product
          </Button>
        }
      />

      {!canManageProducts ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <p>Product management is read-only for this staff role.</p>
          <div className="mt-2">
            <StaffSwitcher label="Switch Staff" />
          </div>
        </div>
      ) : null}

      <div data-testid="products-filter-bar" className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        <FormField label="Search" className="min-w-[220px] md:col-span-2">
          <SearchInput
            value={query}
            onChange={setQuery}
            label="Search products"
            placeholder="Search name, category, type, or description"
          />
        </FormField>
        <FormField label="Category">
          <select
            aria-label="Filter products by category"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value as FilterCategory)}
            className="flex h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
          >
            <option value="all">All categories</option>
            {Object.entries(categoryLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </FormField>
      </div>

      {feedback ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{feedback}</p> : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {filteredProducts.map((product) => {
          const category = getProductCategory(product);
          const tone = getProductToneClass(product);
          const colorLabel = resolveProductColorToken(product);
          return (
            <article key={product.id} className={`rounded-xl border p-4 ${tone}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold">{product.name}</p>
                  <p className="text-sm text-muted-foreground">{categoryLabels[category]} • {product.type ? typeLabels[product.type] : "Access"}</p>
                  {product.description ? <p className="mt-1 text-sm text-muted-foreground">{product.description}</p> : null}
                </div>
                <ProductPriceLabel cents={product.priceCents} />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant={product.active === false ? "secondary" : "success"}>{product.active === false ? "Inactive" : "Active"}</Badge>
                {product.showAsQuickButton ? <Badge variant="secondary">Quick Button</Badge> : null}
                <Badge variant="secondary">Color: {colorLabel}</Badge>
                {product.waiverRequired ? <Badge variant="secondary">Waiver Required</Badge> : null}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" disabled={!canManageProducts} onClick={() => setEditingProduct(product)}>Edit Product</Button>
                <Button
                  variant={product.active === false ? "secondary" : "destructive"}
                  disabled={!canManageProducts}
                  onClick={() => {
                    const result = toggleProductActive(product.id);
                    setFeedback(result.message);
                  }}
                >
                  {product.active === false ? "Activate" : "Deactivate"}
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      {filteredProducts.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-6 text-center">
          <p className="font-medium">No products found.</p>
          <p className="text-sm text-muted-foreground">Adjust filters or add a new product.</p>
        </div>
      ) : null}

      <ProductFormModal
        open={showCreate}
        title="Add Product"
        onClose={() => setShowCreate(false)}
        onSubmit={(input) => {
          const result = createProduct(input);
          if (result.ok) setFeedback(result.message);
          return result;
        }}
      />

      <ProductFormModal
        open={Boolean(editingProduct)}
        title="Edit Product"
        product={editingProduct}
        onClose={() => setEditingProduct(null)}
        onSubmit={(input) => {
          if (!editingProduct) return { ok: false, message: "Product not found." };
          const result = updateProduct(editingProduct.id, input);
          if (result.ok) setFeedback(result.message);
          return result;
        }}
      />
    </section>
  );
}
