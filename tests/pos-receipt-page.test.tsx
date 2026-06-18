import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ReceiptDetailPage from "@/app/(app)/pos/receipts/[transactionId]/page";
import { TopBar } from "@/components/layout/top-bar";
import { buildScopedMockKey } from "@/lib/mock-storage";
import { TestProviders } from "@/tests/test-providers";

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>("next/navigation");
  return {
    ...actual,
    useParams: () => ({ transactionId: "txn_receipt_test" })
  };
});

async function activateStaff(user: ReturnType<typeof userEvent.setup>, pin = "1111") {
  await user.click(screen.getAllByRole("button", { name: "Switch" })[0]);
  await user.type(screen.getByLabelText("Staff PIN input"), pin);
  await user.click(screen.getByRole("button", { name: "Confirm" }));
}

describe("Receipt detail", () => {
  it("renders receipt details and supports refund for permitted staff", async () => {
    const transactionsKey = buildScopedMockKey("org_summit", "loc_001", "transactions");
    window.localStorage.setItem(
      transactionsKey,
      JSON.stringify([
        {
          id: "txn_receipt_test",
          organizationId: "org_summit",
          locationId: "loc_001",
          customerId: "cust_004",
          customerName: "Oslo Fisher",
          soldByStaffId: "staff_002",
          soldByStaffName: "Maya Lopez",
          transactionType: "sale",
          returnStatus: "none",
          items: [
            {
              productId: "prd_001",
              productName: "Day Pass",
              category: "day_passes",
              type: "access",
              quantity: 1,
              unitPrice: 28,
              lineTotal: 28
            }
          ],
          subtotal: 28,
          total: 28,
          paymentType: "card",
          paymentProcessor: "Mock Payments",
          paymentApprovalCode: "APP-TEST",
          paymentCardLast4: "4242",
          completedAt: "2026-05-25T12:00:00Z",
          checkInTriggered: false,
          receiptNumber: "R-TEST01"
        }
      ])
    );

    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ReceiptDetailPage />
      </TestProviders>
    );

    await activateStaff(user, "1111");
    expect(screen.getByText(/Receipt R-TEST01/i)).toBeInTheDocument();
    expect(screen.getByText(/Payment:/i)).toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: "Refund" }));
    await user.click(screen.getByRole("button", { name: "Confirm Refund" }));
    expect(screen.getByRole("status")).toHaveTextContent(/Refunded \$28.00/i);
  });

  it("hides refund action when staff lacks permission", async () => {
    const transactionsKey = buildScopedMockKey("org_summit", "loc_001", "transactions");
    window.localStorage.setItem(
      transactionsKey,
      JSON.stringify([
        {
          id: "txn_receipt_test",
          organizationId: "org_summit",
          locationId: "loc_001",
          customerId: "cust_004",
          customerName: "Oslo Fisher",
          transactionType: "sale",
          returnStatus: "none",
          items: [
            {
              productId: "prd_001",
              productName: "Day Pass",
              category: "day_passes",
              type: "access",
              quantity: 1,
              unitPrice: 28,
              lineTotal: 28
            }
          ],
          subtotal: 28,
          total: 28,
          paymentType: "card",
          completedAt: "2026-05-25T12:00:00Z",
          checkInTriggered: false,
          receiptNumber: "R-TEST01"
        }
      ])
    );

    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ReceiptDetailPage />
      </TestProviders>
    );

    await activateStaff(user, "3333");
    expect(screen.queryByRole("button", { name: "Refund" })).not.toBeInTheDocument();
  });
});
