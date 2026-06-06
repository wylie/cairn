import { useEffect, useMemo, useState } from "react";
import type { KeyboardEventHandler } from "react";
import type { PosProduct } from "@/types/domain";
import { ProductPriceLabel } from "@/components/pos/product-price-label";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { categoryLabels, getProductCategory, getProductToneClass, isCompProduct, typeLabels } from "@/lib/products/catalog";

function normalizeType(type?: string) {
  if (!type) return "access";
  return typeLabels[type] ?? type.replace(/_/g, " ");
}

function ProductButton({ product, blocked, onAdd }: { product: PosProduct; blocked: boolean; onAdd: (id: string) => void }) {
  const category = getProductCategory(product);
  const tone = getProductToneClass(product);

  return (
    <button
      key={product.id}
      onClick={() => onAdd(product.id)}
      disabled={blocked}
      className={`flex w-full min-h-11 items-start justify-between gap-3 rounded-lg border px-3 py-3 text-left transition-colors hover:bg-secondary disabled:opacity-50 ${tone}`}
      aria-label={`Add ${product.name}`}
    >
      <span>
        <span className="block font-medium">{product.name}</span>
        <span className="block text-xs text-muted-foreground">{categoryLabels[category] ?? "Access"} • {normalizeType(product.type)}</span>
        {product.description ? <span className="mt-1 block text-xs text-muted-foreground">{product.description}</span> : null}
      </span>
      <ProductPriceLabel cents={product.priceCents} />
    </button>
  );
}

export function AccessProductPicker({
  products,
  onAdd,
  disableStaffComp,
  onQuickProductsChange
}: {
  products: PosProduct[];
  onAdd: (productId: string) => void;
  disableStaffComp: boolean;
  onQuickProductsChange?: (products: PosProduct[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<PosProduct["category"] | "all">("all");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const activeProducts = useMemo(() => products.filter((product) => product.active !== false), [products]);
  const quickProducts = useMemo(
    () =>
      activeProducts
        .filter((product) => product.showAsQuickButton)
        .sort((a, b) => (a.quickButtonRank ?? 999) - (b.quickButtonRank ?? 999)),
    [activeProducts]
  );
  const visibleCategories = useMemo(() => {
    const keys = new Set(activeProducts.map((product) => getProductCategory(product)));
    return Array.from(keys);
  }, [activeProducts]);
  const categoryFilteredQuickProducts = useMemo(
    () =>
      quickProducts.filter((product) =>
        activeCategory === "all" ? true : getProductCategory(product) === activeCategory
      ),
    [quickProducts, activeCategory]
  );

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return activeProducts.filter((product) => {
      const haystack = [
        product.name,
        product.sku ?? "",
        product.barcode ?? "",
        product.description ?? "",
        product.category,
        product.productCategory ?? "",
        product.type ?? ""
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [activeProducts, query]);

  const hasResults = filteredProducts.length > 0;

  const handleSearchKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (!query) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!hasResults) return;
      setHighlightedIndex((prev) => (prev + 1) % filteredProducts.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!hasResults) return;
      setHighlightedIndex((prev) => (prev - 1 + filteredProducts.length) % filteredProducts.length);
      return;
    }
    if (event.key === "Enter") {
      if (!hasResults) return;
      event.preventDefault();
      onAdd(filteredProducts[highlightedIndex]?.id ?? filteredProducts[0].id);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setQuery("");
      setHighlightedIndex(0);
    }
  };

  useEffect(() => {
    onQuickProductsChange?.(quickProducts);
  }, [quickProducts, onQuickProductsChange]);

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-2 text-sm font-medium">Categories</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={activeCategory === "all" ? "primary" : "secondary"}
            className="h-10"
            onClick={() => setActiveCategory("all")}
          >
            All
          </Button>
          {visibleCategories.map((category) => (
            <Button
              key={category}
              type="button"
              variant={activeCategory === category ? "primary" : "secondary"}
              className="h-10"
              onClick={() => setActiveCategory(category)}
            >
              {categoryLabels[category]}
            </Button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Quick Buttons</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {categoryFilteredQuickProducts.map((product) => (
            <ProductButton
              key={product.id}
              product={product}
              blocked={disableStaffComp && isCompProduct(product)}
              onAdd={onAdd}
            />
          ))}
        </div>
        {categoryFilteredQuickProducts.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No quick products in this category.</p>
        ) : null}
      </div>

      <div>
        <SearchInput
          value={query}
          onChange={(next) => {
            setQuery(next);
            setHighlightedIndex(0);
          }}
          label="Search products"
          placeholder="Find products by name, SKU, barcode, category, type, or description"
          onKeyDown={handleSearchKeyDown}
        />
        {query ? (
          <div role="listbox" aria-label="Product search results" className="mt-2 max-h-[50vh] overflow-y-auto rounded-lg border bg-card p-3 md:max-h-[420px]">
            {filteredProducts.length > 0 ? (
              <div data-testid="product-search-results-grid" className="grid gap-2 sm:grid-cols-2">
                {filteredProducts.map((product, index) => (
                  <div
                    key={product.id}
                    role="option"
                    aria-selected={index === highlightedIndex}
                    className={`rounded-lg ${index === highlightedIndex ? "ring-2 ring-ring ring-offset-2" : ""}`}
                  >
                    <ProductButton
                      product={product}
                      blocked={disableStaffComp && isCompProduct(product)}
                      onAdd={onAdd}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No matching products.</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
