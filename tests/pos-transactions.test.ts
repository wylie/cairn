import { describe, expect, it } from "vitest";
import { normalizeCartItem, createTransactionItem, calculateTransactionTotals } from "@/lib/pos-transactions";
import { posProducts } from "@/lib/mocks/products";

describe("POS transaction helpers", () => {
  it("Day Pass product price is 28", () => {
    const dayPass = posProducts.find((product) => product.name === "Day Pass");
    expect(dayPass?.priceCents).toBe(2800);
  });

  it("adding Day Pass to cart preserves unitPrice 28", () => {
    const dayPass = posProducts.find((product) => product.name === "Day Pass");
    if (!dayPass) throw new Error("Day Pass seed missing");
    const cart = normalizeCartItem(dayPass);
    expect(cart.ok).toBe(true);
    if (!cart.ok) return;
    expect(cart.item.unitPrice).toBe(28);
  });

  it("transaction item preserves unitPrice and computes lineTotal", () => {
    const item = createTransactionItem({
      productId: "prd_001",
      productName: "Day Pass",
      category: "day_passes",
      type: "access",
      quantity: 1,
      unitPrice: 28
    });
    expect(item.unitPrice).toBe(28);
    expect(item.lineTotal).toBe(28);
  });

  it("multi-item transaction totals equal 99", () => {
    const items = [
      createTransactionItem({ productId: "prd_001", productName: "Day Pass", category: "day_passes", type: "access", quantity: 1, unitPrice: 28 }),
      createTransactionItem({ productId: "prd_004", productName: "Class Drop-In", category: "classes", type: "class", quantity: 1, unitPrice: 26 }),
      createTransactionItem({ productId: "prd_005", productName: "Camp Registration", category: "camps", type: "camp", quantity: 1, unitPrice: 45 })
    ];
    const totals = calculateTransactionTotals(items);
    expect(totals.subtotal).toBe(99);
    expect(totals.total).toBe(99);
  });

  it("missing price on paid product does not silently pass", () => {
    const invalidPaid = {
      ...posProducts[0],
      priceCents: undefined as unknown as number
    };
    const result = normalizeCartItem(invalidPaid);
    expect(result.ok).toBe(false);
  });

  it("staff comp can validly resolve to zero", () => {
    const staffComp = posProducts.find((product) => product.name === "Staff Comp");
    if (!staffComp) throw new Error("Staff Comp seed missing");
    const cart = normalizeCartItem(staffComp);
    expect(cart.ok).toBe(true);
    if (!cart.ok) return;
    expect(cart.item.unitPrice).toBe(0);
  });
});

