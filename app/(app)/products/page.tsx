"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Archive, Ban, Copy, GripVertical, Pencil, Plus } from "lucide-react";
import { ProductFormModal } from "@/components/products/product-form-modal";
import { FormField } from "@/components/shared/form-layout";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { StaffSwitcher } from "@/components/staff/staff-switcher";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductPriceLabel } from "@/components/pos/product-price-label";
import { categoryLabels, colorTokenLabels, getProductCategory, productColorTokens, typeLabels } from "@/lib/products/catalog";
import { useCustomerState } from "@/lib/state/customer-state";
import { useWorkstationState } from "@/lib/state/workstation-state";
import type { PosProduct, ProductCategoryRecord } from "@/types/domain";
import { QuickButtonLayoutModal } from "@/components/products/quick-button-layout-modal";
import { data } from "@/lib/data";

type LifecycleFilter = "all" | "active" | "inactive";
type ProductsTab = "products" | "categories" | "inventory" | "collections" | "gift_cards";

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
  const {
    accessProducts,
    activeLocationId,
    inventoryAuditEntries,
    productCategories,
    createProduct,
    updateProduct,
    toggleProductActive,
    adjustProductInventory,
    transferProductInventory,
    createProductCategory,
    updateProductCategory,
    archiveProductCategory,
    reorderProductCategory
  } = useCustomerState();
  const { hasPermission } = useWorkstationState();

  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<ProductsTab>("products");
  const [groupTab, setGroupTab] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>("active");
  const [quickOnly, setQuickOnly] = useState(false);
  const [waiverOnly, setWaiverOnly] = useState(false);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingProduct, setEditingProduct] = useState<PosProduct | null>(null);
  const [layoutModalOpen, setLayoutModalOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [pendingDuplicateProductId, setPendingDuplicateProductId] = useState<string | null>(null);
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState<ProductCategoryRecord["colorToken"]>("slate");
  const orderedCategories = useMemo(
    () => [...productCategories].sort((a, b) => a.displayOrder - b.displayOrder),
    [productCategories]
  );
  const categoryLabelByKey = useMemo(
    () => new Map(orderedCategories.map((entry) => [entry.key, entry.label])),
    [orderedCategories]
  );

  const canManageProducts = hasPermission("manageProducts");
  const displayGroups = useMemo(() => {
    const groups = new Set<string>();
    accessProducts.forEach((product) =>
      groups.add(product.displayType?.trim() || categoryLabelByKey.get(getProductCategory(product)) || categoryLabels[getProductCategory(product)] || "Uncategorized")
    );
    return ["all", ...[...groups].sort((a, b) => a.localeCompare(b))];
  }, [accessProducts, categoryLabelByKey]);
  const knownTags = useMemo(() => {
    const tags = new Set<string>();
    accessProducts.forEach((product) => (product.tags ?? []).forEach((tag) => tags.add(tag)));
    return [...tags].sort((a, b) => a.localeCompare(b));
  }, [accessProducts]);
  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accessProducts.filter((product) => {
      const category = getProductCategory(product);
      const group = product.displayType?.trim() || categoryLabelByKey.get(category) || categoryLabels[category] || "Uncategorized";
      if (groupTab !== "all" && group !== groupTab) return false;
      const tagMatch = tagFilter === "all" || (product.tags ?? []).includes(tagFilter);
      if (!tagMatch) return false;
      if (typeFilter !== "all" && product.type !== typeFilter) return false;
      const lifecycleMatch =
        lifecycleFilter === "all" ? true : lifecycleFilter === "active" ? product.active !== false : product.active === false;
      if (!lifecycleMatch) return false;
      if (quickOnly && !product.showAsQuickButton) return false;
      if (waiverOnly && !product.waiverRequired) return false;
      if (locationFilter !== "all") {
        const allowed = product.facilityAvailability ?? product.eligibleLocationIds ?? [];
        if (allowed.length > 0 && !allowed.includes(locationFilter)) return false;
      }
      if (lowStockOnly) {
        const threshold = product.lowStockThreshold ?? 0;
        const retailQty = Object.values(product.inventoryByLocation ?? {}).reduce((sum, value) => sum + value, 0);
        const variantQty = (product.variants ?? []).reduce(
          (sum, variant) => sum + Object.values(variant.inventoryByLocation ?? {}).reduce((acc, value) => acc + value, 0),
          0
        );
        const totalQty = retailQty + variantQty;
        if (!product.trackInventory || totalQty > threshold) return false;
      }
      if (!q) return true;

      const haystack = [
        product.name,
        product.sku ?? "",
        product.barcode ?? "",
        product.description ?? "",
        categoryLabelByKey.get(category) || categoryLabels[category] || "Uncategorized",
        product.type ? typeLabels[product.type] : "",
        product.accessBehavior ?? "",
        ...(product.tags ?? [])
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [accessProducts, categoryLabelByKey, groupTab, lifecycleFilter, locationFilter, lowStockOnly, query, quickOnly, tagFilter, typeFilter, waiverOnly]);

  useEffect(() => {
    if (!pendingDuplicateProductId) return;
    const product = accessProducts.find((entry) => entry.id === pendingDuplicateProductId);
    if (!product) return;
    setEditingProduct(product);
    setPendingDuplicateProductId(null);
  }, [accessProducts, pendingDuplicateProductId]);

  const inventoryRows = useMemo(() => {
    const rows: Array<{
      key: string;
      productId: string;
      productName: string;
      variantId?: string;
      variantLabel?: string;
      locationId: string;
      locationName: string;
      quantity: number;
      threshold: number;
      lowStock: boolean;
    }> = [];
    const locationMap = new Map(data.locations.map((entry) => [entry.id, entry.name]));
    accessProducts
      .filter((product) => product.trackInventory || product.type === "retail" || product.type === "rental")
      .forEach((product) => {
        const threshold = product.lowStockThreshold ?? 0;
        if (product.variants?.length) {
          product.variants.forEach((variant) => {
            Object.entries(variant.inventoryByLocation ?? {}).forEach(([locationId, quantity]) => {
              rows.push({
                key: `${product.id}:${variant.id}:${locationId}`,
                productId: product.id,
                productName: product.name,
                variantId: variant.id,
                variantLabel: variant.name,
                locationId,
                locationName: locationMap.get(locationId) ?? locationId,
                quantity,
                threshold,
                lowStock: quantity <= threshold
              });
            });
          });
        } else {
          Object.entries(product.inventoryByLocation ?? {}).forEach(([locationId, quantity]) => {
            rows.push({
              key: `${product.id}:${locationId}`,
              productId: product.id,
              productName: product.name,
              locationId,
              locationName: locationMap.get(locationId) ?? locationId,
              quantity,
              threshold,
              lowStock: quantity <= threshold
            });
          });
        }
      });
    return rows.sort((a, b) => a.productName.localeCompare(b.productName));
  }, [accessProducts]);

  const inventoryMetrics = useMemo(() => {
    const lowStock = inventoryRows.filter((row) => row.lowStock).length;
    const inventoryValue = inventoryRows.reduce((sum, row) => {
      const product = accessProducts.find((entry) => entry.id === row.productId);
      const unitCost = product?.costCents ?? Math.round((product?.priceCents ?? 0) * 0.4);
      return sum + unitCost * row.quantity;
    }, 0);
    return {
      lowStock,
      inventoryValue,
      rows: inventoryRows.length
    };
  }, [accessProducts, inventoryRows]);

  return (
    <section className="space-y-4">
      <PageHeader
        title="Products"
        description="Create and manage sellable products for POS, access, and registration workflows."
        actions={
          canManageProducts ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={() => setLayoutModalOpen(true)}>
                <GripVertical className="mr-2 h-4 w-4" />
                Customize Quick Buttons
              </Button>
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </div>
          ) : null
        }
      />

      {!canManageProducts ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800" role="status">
          <p>You do not have permission to manage products.</p>
          <p className="mt-1">Ask a manager for assistance.</p>
          <div className="mt-2">
            <StaffSwitcher label="Switch Staff" />
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["products", "Products"],
            ["categories", "Categories"],
            ["inventory", "Inventory"],
            ["collections", "Collections"],
            ["gift_cards", "Gift Cards"]
          ] as Array<[ProductsTab, string]>
        ).map(([key, label]) => (
          <Button key={key} size="sm" variant={activeTab === key ? "primary" : "secondary"} onClick={() => setActiveTab(key)}>
            {label}
          </Button>
        ))}
      </div>

      <div data-testid="products-filter-bar" className="grid gap-3 [grid-template-columns:minmax(220px,2fr)_repeat(auto-fit,minmax(160px,1fr))]">
        <FormField label="Search" className="min-w-[220px] md:col-span-2">
          <SearchInput
            value={query}
            onChange={setQuery}
            label="Search products"
            placeholder="Search name, SKU, barcode, category, or description"
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
        <FormField label="Type">
          <select
            aria-label="Filter products by type"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="flex h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
          >
            <option value="all">All types</option>
            {Object.entries(typeLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Location">
          <select
            aria-label="Filter products by location"
            value={locationFilter}
            onChange={(event) => setLocationFilter(event.target.value)}
            className="flex h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
          >
            <option value="all">All locations</option>
            {data.locations.map((location) => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
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
            <label className="flex items-center gap-2">
              <input aria-label="Filter low stock products" type="checkbox" checked={lowStockOnly} onChange={(event) => setLowStockOnly(event.target.checked)} />
              Low stock
            </label>
          </div>
        </FormField>
      </div>

      {feedback ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{feedback}</p> : null}

      {activeTab === "products" ? (
        <>
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

      <div className="grid gap-3 lg:grid-cols-2">
        {filteredProducts.map((product) => {
          const category = getProductCategory(product);
          const inventoryTotal =
            Object.values(product.inventoryByLocation ?? {}).reduce((sum, value) => sum + value, 0) +
            (product.variants ?? []).reduce(
              (sum, variant) => sum + Object.values(variant.inventoryByLocation ?? {}).reduce((acc, value) => acc + value, 0),
              0
            );
          const lowStock = Boolean(product.trackInventory && inventoryTotal <= (product.lowStockThreshold ?? 0));
          return (
            <article key={product.id} className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold">{product.name}</p>
                  <p className="text-sm text-muted-foreground">{categoryLabelByKey.get(category) || categoryLabels[category] || "Uncategorized"} • {product.type ? typeLabels[product.type] : "Access"}</p>
                  {product.sku ? <p className="text-xs text-muted-foreground">SKU: {product.sku}</p> : null}
                  {product.barcode ? <p className="text-xs text-muted-foreground">Barcode: {product.barcode}</p> : null}
                  {product.description ? <p className="mt-1 text-sm text-muted-foreground">{product.description}</p> : null}
                </div>
                <ProductPriceLabel cents={product.priceCents} />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone={product.active === false ? "muted" : "success"}>{product.active === false ? "Inactive" : "Active"}</Badge>
                {product.showAsQuickButton ? <Badge tone="default">Quick Button</Badge> : null}
                {product.waiverRequired ? <Badge tone="warning">Waiver Required</Badge> : null}
                {lowStock ? <Badge tone="warning">Low Stock</Badge> : null}
                {product.trackInventory ? <Badge tone="muted">{inventoryTotal} in stock</Badge> : null}
                <Badge tone="muted">Duration: {product.expirationDays ? `${product.expirationDays} days` : product.validDays ? `${product.validDays} day` : product.punchQuantity ? `${product.punchQuantity} punches` : "Configurable"}</Badge>
                {(product.tags ?? []).slice(0, 3).map((tag) => (
                  <Badge key={tag} tone="muted">{tag}</Badge>
                ))}
              </div>
              {product.variants?.length ? (
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {product.variants.slice(0, 3).map((variant) => (
                    <li key={variant.id}>
                      {variant.name} • SKU {variant.sku ?? "n/a"} •{" "}
                      {Object.values(variant.inventoryByLocation ?? {}).reduce((sum, value) => sum + value, 0)} in stock
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                {canManageProducts ? (
                <Button variant="secondary" onClick={() => setEditingProduct(product)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Product
                </Button>
                ) : null}
                {canManageProducts ? (
                <Button variant="secondary" onClick={() => {
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
                ) : null}
                {(product.type === "retail" || product.type === "rental") ? (
                  canManageProducts ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const nextIndex = (product.variants?.length ?? 0) + 1;
                      const result = updateProduct(product.id, {
                        ...product,
                        price: (product.priceCents / 100).toFixed(2),
                        variants: [
                          ...(product.variants ?? []),
                          {
                            id: `var_${product.id}_${nextIndex}`,
                            productId: product.id,
                            name: `Variant ${nextIndex}`,
                            sku: product.sku ? `${product.sku}-V${nextIndex}` : undefined,
                            inventoryByLocation: { [activeLocationId]: 0 },
                            active: true
                          }
                        ]
                      });
                      setFeedback(result.ok ? `Variant created for ${product.name}.` : result.message);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Variant
                  </Button>
                  ) : null
                ) : null}
                {canManageProducts ? (
                <Button
                  variant="secondary"
                  className={product.active === false ? "" : "border-rose-300 text-rose-700 hover:bg-rose-50"}
                  onClick={() => {
                    const result = toggleProductActive(product.id);
                    setFeedback(result.message);
                  }}
                >
                  <Ban className="mr-2 h-4 w-4" />
                  {product.active === false ? "Activate" : "Deactivate"}
                </Button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
      </>
      ) : null}

      {activeTab === "categories" ? (
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold">Categories</h3>
          <p className="text-xs text-muted-foreground">Category controls reporting groups. Type controls product behavior.</p>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-[2fr_1fr_auto]">
          <FormField label="New category">
            <input
              aria-label="New category"
              value={newCategoryLabel}
              onChange={(event) => setNewCategoryLabel(event.target.value)}
              className="flex h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
              placeholder="Example: Parties"
            />
          </FormField>
          <FormField label="Color">
            <select
              aria-label="New category color"
              value={newCategoryColor}
              onChange={(event) => setNewCategoryColor(event.target.value as ProductCategoryRecord["colorToken"])}
              className="flex h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
            >
              {productColorTokens.map((token) => (
                <option key={token} value={token}>{colorTokenLabels[token]}</option>
              ))}
            </select>
          </FormField>
          <div className="flex items-end">
            <Button
              variant="secondary"
              onClick={() => {
                const result = createProductCategory({ label: newCategoryLabel, colorToken: newCategoryColor });
                setFeedback(result.message);
                if (result.ok) setNewCategoryLabel("");
              }}
              disabled={!canManageProducts}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-3">Category</th>
                <th className="py-2 pr-3">Key</th>
                <th className="py-2 pr-3">Color</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orderedCategories.map((category) => (
                <tr key={category.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-3">
                    <input
                      aria-label={`Category name ${category.key}`}
                      defaultValue={category.label}
                      className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
                      onBlur={(event) => {
                        if (event.target.value.trim() === category.label) return;
                        const result = updateProductCategory(category.id, { label: event.target.value });
                        setFeedback(result.message);
                      }}
                      disabled={!canManageProducts}
                    />
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs">{category.key}</td>
                  <td className="py-2 pr-3">
                    <select
                      aria-label={`Category color ${category.key}`}
                      value={category.colorToken ?? "slate"}
                      onChange={(event) => {
                        const result = updateProductCategory(category.id, {
                          colorToken: event.target.value as ProductCategoryRecord["colorToken"]
                        });
                        setFeedback(result.message);
                      }}
                      className="h-9 rounded-md border border-input bg-white px-2 text-sm"
                      disabled={!canManageProducts}
                    >
                      {productColorTokens.map((token) => (
                        <option key={token} value={token}>{colorTokenLabels[token]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-3">
                    <Badge tone={category.active ? "success" : "muted"}>
                      {category.active ? (category.isSystem ? "System" : "Custom") : "Archived"}
                    </Badge>
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" aria-label={`Move ${category.label} up`} onClick={() => reorderProductCategory(category.id, "up")} disabled={!canManageProducts}>
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" aria-label={`Move ${category.label} down`} onClick={() => reorderProductCategory(category.id, "down")} disabled={!canManageProducts}>
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      {!category.isSystem ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Archive ${category.label}`}
                          onClick={() => {
                            const result = archiveProductCategory(category.id);
                            setFeedback(result.message);
                          }}
                          disabled={!canManageProducts || !category.active}
                        >
                          <Archive className="h-4 w-4 text-rose-700" />
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      ) : null}

      {activeTab === "inventory" ? (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-4">
            <article className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Top Sellers</p><p className="text-2xl font-semibold">Liquid Chalk</p></article>
            <article className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Low Stock</p><p className="text-2xl font-semibold">{inventoryMetrics.lowStock}</p></article>
            <article className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Inventory Value</p><p className="text-2xl font-semibold">${(inventoryMetrics.inventoryValue / 100).toFixed(0)}</p></article>
            <article className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Tracked Rows</p><p className="text-2xl font-semibold">{inventoryMetrics.rows}</p></article>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-base font-semibold">Inventory by facility</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3">Product</th>
                    <th className="py-2 pr-3">Variant</th>
                    <th className="py-2 pr-3">Location</th>
                    <th className="py-2 pr-3">Qty</th>
                    <th className="py-2 pr-3">Threshold</th>
                    <th className="py-2 pr-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryRows.map((row) => (
                    <tr key={row.key} className="border-b last:border-b-0">
                      <td className="py-2 pr-3">{row.productName}</td>
                      <td className="py-2 pr-3">{row.variantLabel ?? "Base"}</td>
                      <td className="py-2 pr-3">{row.locationName}</td>
                      <td className="py-2 pr-3">
                        <span aria-label={`Inventory quantity ${row.key}`}>{row.quantity}</span>
                        {row.lowStock ? <Badge tone="warning" className="ml-2">Low Stock</Badge> : null}
                      </td>
                      <td className="py-2 pr-3">{row.threshold}</td>
                      <td className="py-2 pr-3">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="secondary" aria-label={`Receive stock ${row.key}`} onClick={() => {
                            const result = adjustProductInventory({
                              productId: row.productId,
                              variantId: row.variantId,
                              locationId: row.locationId,
                              quantityDelta: 5,
                              action: "receive"
                            });
                            setFeedback(result.message);
                          }}>+5</Button>
                          <Button size="sm" variant="secondary" aria-label={`Adjust stock ${row.key}`} onClick={() => {
                            const result = adjustProductInventory({
                              productId: row.productId,
                              variantId: row.variantId,
                              locationId: row.locationId,
                              quantityDelta: -1,
                              action: "adjust"
                            });
                            setFeedback(result.message);
                          }}>-1</Button>
                          <Button size="sm" variant="secondary" aria-label={`Transfer stock ${row.key}`} onClick={() => {
                            const product = accessProducts.find((entry) => entry.id === row.productId);
                            const other =
                              data.locations.find((entry) => entry.id !== row.locationId && entry.organizationId === product?.organizationId) ??
                              data.locations.find((entry) => entry.id !== row.locationId);
                            if (!other) return;
                            const result = transferProductInventory({
                              productId: row.productId,
                              variantId: row.variantId,
                              fromLocationId: row.locationId,
                              toLocationId: other.id,
                              quantity: 1
                            });
                            setFeedback(result.message);
                          }}>Transfer</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {inventoryRows.length === 0 ? (
                    <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">No tracked inventory.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-base font-semibold">Inventory activity</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {inventoryAuditEntries.slice(0, 8).map((entry) => (
                <li key={entry.id} className="rounded-md border px-3 py-2">
                  <p className="font-medium">{entry.action.replace("_", " ")} {entry.quantityDelta > 0 ? `+${entry.quantityDelta}` : entry.quantityDelta}</p>
                  <p className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</p>
                </li>
              ))}
              {inventoryAuditEntries.length === 0 ? <li className="text-muted-foreground">No inventory activity yet.</li> : null}
            </ul>
          </div>
        </div>
      ) : null}

      {activeTab === "collections" ? (
        <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
          Collections are ready for online merchandising groupings. Use product tags and featured flags now; saved collection rules can be added next.
        </div>
      ) : null}

      {activeTab === "gift_cards" ? (
        <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
          Gift cards are modeled as products (`type: gift-card`) and can be sold in POS once checkout flow wiring is complete.
        </div>
      ) : null}

      {activeTab === "products" && filteredProducts.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-6 text-center">
          <p className="font-medium">No products found.</p>
          <p className="text-sm text-muted-foreground">Adjust filters or add a new product.</p>
        </div>
      ) : null}

      <ProductFormModal
        open={showCreate}
        title="Add Product"
        categories={orderedCategories}
        knownTags={knownTags}
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
        categories={orderedCategories}
        knownTags={knownTags}
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
