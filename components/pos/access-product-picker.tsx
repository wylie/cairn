import { useMemo, useState } from "react";
import type { KeyboardEventHandler } from "react";
import type { PosProduct } from "@/types/domain";
import { ProductPriceLabel } from "@/components/pos/product-price-label";
import { SearchInput } from "@/components/shared/search-input";
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
  disableStaffComp
}: {
  products: PosProduct[];
  onAdd: (productId: string) => void;
  disableStaffComp: boolean;
}) {
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const activeProducts = useMemo(() => products.filter((product) => product.active !== false), [products]);
  const quickProducts = useMemo(() => activeProducts.filter((product) => product.showAsQuickButton), [activeProducts]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return activeProducts.filter((product) => {
      const haystack = [
        product.name,
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

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-2 text-sm font-medium">Quick Buttons</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {quickProducts.map((product) => (
            <ProductButton
              key={product.id}
              product={product}
              blocked={disableStaffComp && isCompProduct(product)}
              onAdd={onAdd}
            />
          ))}
        </div>
      </div>

      <div>
        <SearchInput
          value={query}
          onChange={(next) => {
            setQuery(next);
            setHighlightedIndex(0);
          }}
          label="Search products"
          placeholder="Find products by name, category, type, or description"
          onKeyDown={handleSearchKeyDown}
        />
        {query ? (
          <div role="listbox" aria-label="Product search results" className="mt-2 rounded-lg border bg-card p-3">
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
