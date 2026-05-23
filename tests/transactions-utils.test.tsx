import { render, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import { CustomerDetailView } from "@/components/customers/customer-detail-view";
import { buildScopedMockKey } from "@/lib/mock-storage";
import { posProducts } from "@/lib/mocks/products";
import { formatCurrency, normalizeTransaction, normalizeTransactions } from "@/lib/transactions";
import { TestProviders } from "@/tests/test-providers";

describe("transaction formatting and normalization", () => {
  it("formatCurrency handles undefined", () => {
    expect(formatCurrency(undefined)).toBe("$0.00");
  });

  it("formatCurrency handles null", () => {
    expect(formatCurrency(null)).toBe("$0.00");
  });

  it("formatCurrency handles valid numbers", () => {
    expect(formatCurrency(26)).toBe("$26.00");
  });

  it("legacy transaction data is normalized on load", () => {
    const normalized = normalizeTransaction({
      id: "txn_old",
      customerId: "cust_003",
      customerName: "Alex Rivera",
      items: [{ productId: "prd_old" }]
    });

    expect(normalized.total).toBe(0);
    expect(normalized.subtotal).toBe(0);
    expect(normalized.items[0].productName).toBe("Unknown item");
    expect(normalized.receiptNumber).toBe("R-LEGACY");
    expect(normalized.transactionType).toBe("sale");
    expect(normalized.returnStatus).toBe("none");
  });

  it("preserves unitPrice and calculates lineTotal from quantity when missing", () => {
    const normalized = normalizeTransaction({
      id: "txn_math",
      customerId: "cust_003",
      customerName: "Alex Rivera",
      items: [{ productId: "prd_001", productName: "Day Pass", unitPrice: 28, quantity: 2 }]
    }, posProducts);

    expect(normalized.items[0].unitPrice).toBe(28);
    expect(normalized.items[0].lineTotal).toBe(56);
    expect(normalized.subtotal).toBe(56);
    expect(normalized.total).toBe(56);
  });

  it("customer profile renders with missing transaction total and items", () => {
    const store = new Map<string, string>();
    const original = window.localStorage;

    const txKey = buildScopedMockKey("org_summit", "loc_001", "transactions");
    const malformed = [
      {
        id: "txn_broken_1",
        organizationId: "org_summit",
        locationId: "loc_001",
        customerId: "cust_003",
        customerName: "Alex Rivera",
        completedAt: "2026-05-21T13:00:00Z",
        paymentType: "mock",
        checkInTriggered: false,
        receiptNumber: "R-BROKEN"
      }
    ];
    store.set(txKey, JSON.stringify(malformed));

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) => store.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
          store.set(key, value);
        }),
        removeItem: vi.fn((key: string) => {
          store.delete(key);
        })
      }
    });

    render(
      <TestProviders>
        <CustomerDetailView customerId="cust_003" />
      </TestProviders>
    );

    const purchases = screen.getByLabelText("detail-purchases");
    expect(purchases).toBeInTheDocument();
    expect(within(purchases).getByText("Unknown item")).toBeInTheDocument();
    expect(within(purchases).getAllByText(/Total:\s*\$0.00/i).length).toBeGreaterThan(0);

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: original
    });
  });

  it("normalizeTransactions normalizes arrays", () => {
    const result = normalizeTransactions([{ customerId: "cust_001" }], posProducts);
    expect(result[0].customerId).toBe("cust_001");
    expect(result[0].items).toEqual([]);
  });

  it("recovers missing prices from product catalog without overwriting valid non-zero values", () => {
    const result = normalizeTransaction(
      {
        id: "txn_recover",
        customerId: "cust_001",
        customerName: "Maya Patel",
        items: [
          { productId: "prd_004", productName: "Class Drop-In", quantity: 1, unitPrice: 0, lineTotal: 0 },
          { productId: "prd_001", productName: "Day Pass", quantity: 1, unitPrice: 28, lineTotal: 28 }
        ]
      },
      posProducts
    );

    expect(result.items[0].unitPrice).toBe(26);
    expect(result.items[0].lineTotal).toBe(26);
    expect(result.items[1].unitPrice).toBe(28);
    expect(result.items[1].lineTotal).toBe(28);
    expect(result.total).toBe(54);
  });
});
