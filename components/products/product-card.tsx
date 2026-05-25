import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductPriceLabel } from "@/components/pos/product-price-label";
import { AccessEligibilityBadge } from "@/components/products/access-eligibility-badge";
import { ProductStatusBadge } from "@/components/products/product-status-badge";
import { ProductTypeChip } from "@/components/products/product-type-chip";
import type { PosProduct } from "@/types/domain";

export function ProductCard({
  product,
  onEdit,
  onDuplicate,
  onArchive
}: {
  product: PosProduct;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
}) {
  return (
    <article className="rounded-xl border bg-card p-4 shadow-sm" data-testid="membership-product-card">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-base font-semibold">{product.name}</p>
          {product.description ? <p className="text-sm text-muted-foreground">{product.description}</p> : null}
        </div>
        <ProductPriceLabel cents={product.priceCents} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <ProductStatusBadge active={product.active} />
        <ProductTypeChip product={product} />
        {product.showAsQuickButton ? <Badge tone="default">Quick Button</Badge> : null}
        <AccessEligibilityBadge waiverRequired={product.waiverRequired} guardianRequired={product.guardianRequired} />
        {product.expirationDays ? <Badge tone="muted">Expires in {product.expirationDays} days</Badge> : null}
        {product.punchQuantity ? <Badge tone="muted">{product.punchQuantity} punches</Badge> : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" className="h-9" onClick={onEdit}>Edit</Button>
        <Button variant="secondary" className="h-9" onClick={onDuplicate}>Duplicate</Button>
        <Button variant="destructive" className="h-9" onClick={onArchive}>{product.active === false ? "Activate" : "Archive"}</Button>
      </div>
    </article>
  );
}

