"use client";

import { useEffect, useMemo, useState } from "react";
import { Ban, Copy, GripVertical, Pencil, Plus } from "lucide-react";
import { ProductFormModal } from "@/components/products/product-form-modal";
import { FormField } from "@/components/shared/form-layout";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { StaffSwitcher } from "@/components/staff/staff-switcher";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductPriceLabel } from "@/components/pos/product-price-label";
import { categoryLabels, getProductCategory, typeLabels } from "@/lib/products/catalog";
import { useCustomerState } from "@/lib/state/customer-state";
import { useWorkstationState } from "@/lib/state/workstation-state";
import type { PosProduct } from "@/types/domain";
import { QuickButtonLayoutModal } from "@/components/products/quick-button-layout-modal";

type LifecycleFilter = "all" | "active" | "inactive";

function nextDuplicateName(baseName: string, products: PosProduct[]) {
  const escaped = baseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`^${escaped} - Copy(?: (\\d+))?$`);
  const taken = new Set(products.map((product) => product.name));
  if (!taken.has(`${baseName} - Copy`)) return `${baseName} - Copy`;

  let max = 1;
  products.forEach((product) => {
    const match = product.name.match(regex);
    if (!match) return;
    const n = match[1] ? Number(match[1]) : 1;
    if (Number.isFinite(n)) max = Math.max(max, n);
  });
  return `${baseName} - Copy ${max + 1}`;
}

export default function ProductsPage() {
  const { accessProducts, createProduct, updateProduct, toggleProductActive } = useCustomerState();
  const { hasPermission } = useWorkstationState();

  const [query, setQuery] = useState("");
  const [groupTab, setGroupTab] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>("active");
  const [quickOnly, setQuickOnly] = useState(false);
  const [waiverOnly, setWaiverOnly] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingProduct, setEditingProduct] = useState<PosProduct | null>(null);
  const [layoutModalOpen, setLayoutModalOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [pendingDuplicateProductId, setPendingDuplicateProductId] = useState<string | null>(null);

  const canManageProducts = hasPermission("manageProducts");
  const displayGroups = useMemo(() => {
    const groups = new Set<string>();
    accessProducts.forEach((product) => groups.add(product.displayType?.trim() || categoryLabels[getProductCategory(product)]));
    return ["all", ...[...groups].sort((a, b) => a.localeCompare(b))];
  }, [accessProducts]);
  const knownTags = useMemo(() => {
    const tags = new Set<string>();
    accessProducts.forEach((product) => (product.tags ?? []).forEach((tag) => tags.add(tag)));
    return [...tags].sort((a, b) => a.localeCompare(b));
  }, [accessProducts]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accessProducts.filter((product) => {
      const category = getProductCategory(product);
      const group = product.displayType?.trim() || categoryLabels[category];
      if (groupTab !== "all" && group !== groupTab) return false;
      const tagMatch = tagFilter === "all" || (product.tags ?? []).includes(tagFilter);
      if (!tagMatch) return false;
      const lifecycleMatch =
        lifecycleFilter === "all" ? true : lifecycleFilter === "active" ? product.active !== false : product.active === false;
      if (!lifecycleMatch) return false;
      if (quickOnly && !product.showAsQuickButton) return false;
      if (waiverOnly && !product.waiverRequired) return false;
      if (!q) return true;

      const haystack = [
        product.name,
        product.description ?? "",
        categoryLabels[category],
        product.type ? typeLabels[product.type] : "",
        product.accessBehavior ?? "",
        ...(product.tags ?? [])
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [accessProducts, groupTab, lifecycleFilter, query, quickOnly, tagFilter, waiverOnly]);

  useEffect(() => {
    if (!pendingDuplicateProductId) return;
    const product = accessProducts.find((entry) => entry.id === pendingDuplicateProductId);
    if (!product) return;
    setEditingProduct(product);
    setPendingDuplicateProductId(null);
  }, [accessProducts, pendingDuplicateProductId]);

  return (
    <section className="space-y-4">
      <PageHeader
        title="Products"
        description="Create and manage sellable products for POS, access, and registration workflows."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => setLayoutModalOpen(true)} disabled={!canManageProducts}>
              <GripVertical className="mr-2 h-4 w-4" />
              Customize Quick Buttons
            </Button>
            <Button onClick={() => setShowCreate(true)} disabled={!canManageProducts}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </div>
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

      <div className="flex flex-wrap gap-2">
        {displayGroups.map((tab) => (
          <Button
            key={tab}
            size="sm"
            variant={groupTab === tab ? "primary" : "secondary"}
            onClick={() => setGroupTab(tab)}
          >
            {tab === "all" ? "All" : tab}
          </Button>
        ))}
      </div>

      <div data-testid="products-filter-bar" className="grid gap-3 [grid-template-columns:minmax(220px,2fr)_repeat(auto-fit,minmax(160px,1fr))]">
        <FormField label="Search" className="min-w-[220px] md:col-span-2">
          <SearchInput
            value={query}
            onChange={setQuery}
            label="Search products"
            placeholder="Search name, category, type, or description"
          />
        </FormField>
        <FormField label="Tags">
          <select
            aria-label="Filter products by tag"
            value={tagFilter}
            onChange={(event) => setTagFilter(event.target.value)}
            className="flex h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
          >
            <option value="all">All tags</option>
            {knownTags.map((tag) => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Status">
          <select
            aria-label="Filter products by status"
            value={lifecycleFilter}
            onChange={(event) => setLifecycleFilter(event.target.value as LifecycleFilter)}
            className="flex h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Archived</option>
          </select>
        </FormField>
        <FormField label="Flags">
          <div className="flex h-11 items-center gap-3 rounded-md border border-input px-3 text-sm">
            <label className="flex items-center gap-2">
              <input aria-label="Filter quick button products" type="checkbox" checked={quickOnly} onChange={(event) => setQuickOnly(event.target.checked)} />
              Quick
            </label>
            <label className="flex items-center gap-2">
              <input aria-label="Filter waiver required products" type="checkbox" checked={waiverOnly} onChange={(event) => setWaiverOnly(event.target.checked)} />
              Waiver
            </label>
          </div>
        </FormField>
      </div>

      {feedback ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{feedback}</p> : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {filteredProducts.map((product) => {
          const category = getProductCategory(product);
          return (
            <article key={product.id} className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold">{product.name}</p>
                  <p className="text-sm text-muted-foreground">{categoryLabels[category]} • {product.type ? typeLabels[product.type] : "Access"}</p>
                  {product.description ? <p className="mt-1 text-sm text-muted-foreground">{product.description}</p> : null}
                </div>
                <ProductPriceLabel cents={product.priceCents} />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone={product.active === false ? "muted" : "success"}>{product.active === false ? "Inactive" : "Active"}</Badge>
                {product.showAsQuickButton ? <Badge tone="default">Quick Button</Badge> : null}
                {product.waiverRequired ? <Badge tone="warning">Waiver Required</Badge> : null}
                <Badge tone="muted">Duration: {product.expirationDays ? `${product.expirationDays} days` : product.validDays ? `${product.validDays} day` : product.punchQuantity ? `${product.punchQuantity} punches` : "Configurable"}</Badge>
                {(product.tags ?? []).slice(0, 3).map((tag) => (
                  <Badge key={tag} tone="muted">{tag}</Badge>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" disabled={!canManageProducts} onClick={() => setEditingProduct(product)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Product
                </Button>
                <Button variant="ghost" disabled={!canManageProducts} onClick={() => {
                  const name = nextDuplicateName(product.name, accessProducts);
                  const result = createProduct({
                    ...product,
                    name,
                    price: (product.priceCents / 100).toFixed(2)
                  });
                  if (result.ok && result.productId) {
                    setFeedback(`${result.message} Opened copy for editing.`);
                    setPendingDuplicateProductId(result.productId);
                  } else {
                    setFeedback(result.message);
                  }
                }}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </Button>
                <Button
                  variant="secondary"
                  className={product.active === false ? "" : "border-rose-300 text-rose-700 hover:bg-rose-50"}
                  disabled={!canManageProducts}
                  onClick={() => {
                    const result = toggleProductActive(product.id);
                    setFeedback(result.message);
                  }}
                >
                  <Ban className="mr-2 h-4 w-4" />
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
      <QuickButtonLayoutModal
        open={layoutModalOpen}
        onClose={() => setLayoutModalOpen(false)}
      />
    </section>
  );
}
