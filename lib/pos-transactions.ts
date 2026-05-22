import type { PosProduct, PosTransactionItem } from "@/types/domain";
import { isCompProduct } from "@/lib/products/catalog";

type CartItem = {
  productId: string;
  productName: string;
  category: PosProduct["category"];
  type: NonNullable<PosProduct["type"]>;
  quantity: number;
  unitPrice: number;
};

function warnInvalidPrice(product: PosProduct) {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn(`[pos] invalid price for paid product "${product.name}" (${product.id})`);
  }
}

export function normalizeProductPriceCents(product: Partial<PosProduct>) {
  if (typeof product.priceCents === "number" && Number.isFinite(product.priceCents)) {
    return Math.max(0, Math.round(product.priceCents));
  }

  const maybeLegacy = (product as { price?: number | string }).price;
  if (typeof maybeLegacy === "number" && Number.isFinite(maybeLegacy)) {
    if (maybeLegacy > 1000) return Math.round(maybeLegacy);
    return Math.round(maybeLegacy * 100);
  }

  if (typeof maybeLegacy === "string") {
    const parsed = Number(maybeLegacy);
    if (Number.isFinite(parsed)) return parsed > 1000 ? Math.round(parsed) : Math.round(parsed * 100);
  }

  return null;
}

export function normalizeCartItem(product: PosProduct): { ok: true; item: CartItem } | { ok: false; message: string } {
  const cents = normalizeProductPriceCents(product);
  if (cents === null) {
    if (!isCompProduct(product)) {
      warnInvalidPrice(product);
      return { ok: false, message: `Product "${product.name}" is missing a valid price.` };
    }
  }

  const unitPrice = Number(((cents ?? 0) / 100).toFixed(2));
  if (!isCompProduct(product) && unitPrice <= 0) {
    warnInvalidPrice(product);
    return { ok: false, message: `Product "${product.name}" has an invalid paid price.` };
  }

  return {
    ok: true,
    item: {
      productId: product.id,
      productName: product.name,
      category: product.category,
      type: product.type ?? "access",
      quantity: 1,
      unitPrice
    }
  };
}

export function createTransactionItem(cartItem: CartItem): PosTransactionItem {
  return {
    productId: cartItem.productId,
    productName: cartItem.productName,
    category: cartItem.category,
    type: cartItem.type,
    quantity: cartItem.quantity,
    unitPrice: Number(cartItem.unitPrice.toFixed(2)),
    lineTotal: Number((cartItem.quantity * cartItem.unitPrice).toFixed(2))
  };
}

export function calculateTransactionTotals(items: PosTransactionItem[]) {
  const subtotal = Number(items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
  return {
    subtotal,
    total: subtotal
  };
}

