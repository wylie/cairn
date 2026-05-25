import { Badge } from "@/components/ui/badge";
import { getProductCategory, categoryLabels, typeLabels } from "@/lib/products/catalog";
import type { PosProduct } from "@/types/domain";

export function ProductTypeChip({ product }: { product: PosProduct }) {
  const category = getProductCategory(product);
  const typeLabel = product.type ? typeLabels[product.type] : "Access";
  return <Badge tone="muted">{categoryLabels[category]} • {typeLabel}</Badge>;
}

