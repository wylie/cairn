import { isCompProduct } from "@/lib/products/catalog";
import type { PosProduct, PosTransaction, PosTransactionItem } from "@/types/domain";

export function formatCurrency(value: number | null | undefined, fallback: "$0.00" | "—" = "$0.00") {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    return fallback;
  }
  return `$${value.toFixed(2)}`;
}

function normalizeProductPriceCents(product: Partial<PosProduct>) {
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

function buildProductIndex(products: PosProduct[]) {
  const byId = new Map<string, PosProduct>();
  const byName = new Map<string, PosProduct>();

  products.forEach((product) => {
    byId.set(product.id, product);
    byName.set(product.name.trim().toLowerCase(), product);
  });

  return { byId, byName };
}

function resolvePriceFromProduct(item: Partial<PosTransactionItem>, products: ReturnType<typeof buildProductIndex>) {
  const fromId = item.productId ? products.byId.get(item.productId) : undefined;
  const fromName = !fromId && item.productName ? products.byName.get(item.productName.trim().toLowerCase()) : undefined;
  const product = fromId ?? fromName;
  if (!product) return { unitPrice: null, isFree: false };

  const cents = normalizeProductPriceCents(product);
  const unitPrice = cents === null ? null : Number((cents / 100).toFixed(2));
  return { unitPrice, isFree: isCompProduct(product) };
}

function normalizeItem(item: Partial<PosTransactionItem>, index: number, products: ReturnType<typeof buildProductIndex>): PosTransactionItem {
  const quantity = typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 1;
  const rawUnitPrice = typeof item.unitPrice === "number" && Number.isFinite(item.unitPrice) ? item.unitPrice : null;
  const rawLineTotal = typeof item.lineTotal === "number" && Number.isFinite(item.lineTotal) ? item.lineTotal : null;
  const { unitPrice: recoveredUnitPrice, isFree } = resolvePriceFromProduct(item, products);

  const unitPrice =
    rawUnitPrice !== null && rawUnitPrice > 0
      ? rawUnitPrice
      : recoveredUnitPrice !== null && recoveredUnitPrice > 0
      ? recoveredUnitPrice
      : isFree
      ? 0
      : rawUnitPrice === 0 && recoveredUnitPrice === 0
      ? 0
      : recoveredUnitPrice ?? rawUnitPrice ?? 0;

  const lineTotal =
    rawLineTotal !== null && rawLineTotal > 0
      ? rawLineTotal
      : Number((unitPrice * quantity).toFixed(2));

  return {
    productId: item.productId ?? `legacy_item_${index}`,
    productName: item.productName ?? "Unknown item",
    category: item.category ?? "misc",
    type: item.type ?? "access",
    quantity,
    unitPrice: Number(unitPrice.toFixed(2)),
    lineTotal: Number(lineTotal.toFixed(2))
  };
}

export function normalizeTransaction(entry: Partial<PosTransaction>, products: PosProduct[] = []): PosTransaction {
  const productIndex = buildProductIndex(products);
  const rawItems = Array.isArray(entry.items) ? entry.items : [];
  const items = rawItems.map((item, index) => normalizeItem(item, index, productIndex));
  const itemSum = Number(items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));

  const storedSubtotal = typeof entry.subtotal === "number" && Number.isFinite(entry.subtotal) ? entry.subtotal : null;
  const storedTotal = typeof entry.total === "number" && Number.isFinite(entry.total) ? entry.total : null;

  const normalizedSubtotal =
    storedSubtotal !== null && storedSubtotal > 0 ? storedSubtotal : itemSum;
  const normalizedTotal =
    storedTotal !== null && storedTotal > 0 ? storedTotal : normalizedSubtotal;

  const checkInSlots = Array.isArray(entry.checkInSlots)
    ? entry.checkInSlots.map((slot, index) => ({
        id: slot.id ?? `slot_${index}_${Math.random().toString(36).slice(2, 7)}`,
        transactionId: slot.transactionId ?? entry.id ?? "",
        productId: slot.productId ?? "",
        productName: slot.productName ?? "Unknown product",
        accessType: slot.accessType ?? "access",
        assignedCustomerId: slot.assignedCustomerId,
        assignedCustomerName: slot.assignedCustomerName,
        status: slot.status ?? "available",
        checkedInAt: slot.checkedInAt,
        checkedInByStaffId: slot.checkedInByStaffId,
        checkedInByStaffName: slot.checkedInByStaffName,
        checkInRecordId: slot.checkInRecordId
      }))
    : undefined;

  const fallbackCustomerName = typeof entry.customerName === "string" ? entry.customerName : "";
  const slotsWithFallback = checkInSlots?.map((slot, index) =>
    index === 0 && !slot.assignedCustomerId && entry.customerId
      ? {
          ...slot,
          assignedCustomerId: entry.customerId,
          assignedCustomerName: slot.assignedCustomerName ?? fallbackCustomerName
        }
      : slot
  );

  return {
    id: entry.id ?? `txn_legacy_${Math.random().toString(36).slice(2, 8)}`,
    organizationId: entry.organizationId ?? "org_summit",
    locationId: entry.locationId ?? "loc_001",
    customerId: entry.customerId ?? "",
    customerName: typeof entry.customerName === "string" ? entry.customerName : "",
    customerEmail: entry.customerEmail,
    customerMemberId: entry.customerMemberId,
    purchaserCustomerId: entry.purchaserCustomerId ?? entry.customerId,
    purchaserCustomerName: entry.purchaserCustomerName ?? entry.customerName,
    purchasedForCustomerIds: Array.isArray(entry.purchasedForCustomerIds)
      ? entry.purchasedForCustomerIds.filter((value): value is string => typeof value === "string")
      : entry.customerId
      ? [entry.customerId]
      : [],
    householdId: entry.householdId,
    transactionType: entry.transactionType ?? "sale",
    originalTransactionId: entry.originalTransactionId,
    returnStatus: entry.returnStatus ?? "none",
    returnedItemIds: Array.isArray(entry.returnedItemIds) ? entry.returnedItemIds : undefined,
    refundedTotal: typeof entry.refundedTotal === "number" && Number.isFinite(entry.refundedTotal) ? entry.refundedTotal : undefined,
    soldByStaffId: entry.soldByStaffId,
    soldByStaffName: entry.soldByStaffName,
    items,
    subtotal: Number(normalizedSubtotal.toFixed(2)),
    total: Number(normalizedTotal.toFixed(2)),
    paymentType:
      entry.paymentType === "card" ||
      entry.paymentType === "cash" ||
      entry.paymentType === "comp" ||
      entry.paymentType === "gift_card" ||
      entry.paymentType === "account_credit" ||
      entry.paymentType === "split"
        ? entry.paymentType
        : "mock",
    receiptStatus:
      entry.receiptStatus === "pending" ||
      entry.receiptStatus === "refunded" ||
      entry.receiptStatus === "partially_refunded" ||
      entry.receiptStatus === "voided" ||
      entry.receiptStatus === "comped" ||
      entry.receiptStatus === "paid"
        ? entry.receiptStatus
        : (entry.paymentType === "comp" ? "comped" : "paid"),
    paymentProcessor: entry.paymentProcessor,
    paymentApprovalCode: entry.paymentApprovalCode,
    paymentCardLast4: entry.paymentCardLast4,
    refundReason: entry.refundReason,
    completedAt: entry.completedAt ?? new Date().toISOString(),
    checkInTriggered: Boolean(entry.checkInTriggered),
    receiptNumber: entry.receiptNumber ?? `R-LEGACY`,
    checkInSlots: slotsWithFallback
  };
}

export function normalizeTransactions(entries: Partial<PosTransaction>[], products: PosProduct[] = []) {
  return entries.map((entry) => normalizeTransaction(entry, products));
}
