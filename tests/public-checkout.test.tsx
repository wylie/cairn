import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsStateProvider } from "@/lib/state/settings-state";
import { CustomerStateProvider, useCustomerState } from "@/lib/state/customer-state";
import { PublicCartProvider } from "@/lib/public-cart";
import { WorkstationStateProvider } from "@/lib/state/workstation-state";
import { OnlineCheckout } from "@/components/public/online-checkout";
import { PublicRegistrationPanel } from "@/components/public/public-registration-panel";
import { programs, classCampSessions } from "@/lib/mocks/programs";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/p/summit/checkout",
  useRouter: () => ({ push, refresh })
}));

function PublicTestProviders({ children }: { children: React.ReactNode }) {
  return (
    <WorkstationStateProvider>
      <SettingsStateProvider>
        <CustomerStateProvider>
          <PublicCartProvider>{children}</PublicCartProvider>
        </CustomerStateProvider>
      </SettingsStateProvider>
    </WorkstationStateProvider>
  );
}

describe("online checkout", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.cookie = "cairn_mock_auth=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    push.mockReset();
    refresh.mockReset();
  });

  it("renders checkout workspace", () => {
    render(
      <PublicTestProviders>
        <OnlineCheckout orgSlug="summit" />
      </PublicTestProviders>
    );
    expect(screen.getByTestId("online-checkout-page")).toBeInTheDocument();
    expect(screen.getByText("Online Registration & Checkout")).toBeInTheDocument();
  });

  it("supports mixed carts with membership purchase and adult registration", async () => {
    let state: ReturnType<typeof useCustomerState> | null = null;
    function Probe() {
      state = useCustomerState();
      return null;
    }
    render(
      <PublicTestProviders>
        <Probe />
      </PublicTestProviders>
    );
    if (!state) throw new Error("Missing state");

    await act(async () => {
      state!.signWaiverForCustomer({
        customerId: "cust_001",
        templateId: "wtpl_general",
        typedName: "Maya Patel",
        signedByName: "Maya Patel",
        source: "online"
      });
    });
    let result: ReturnType<typeof state.completePublicCheckout> | undefined;
    await act(async () => {
      result = state!.completePublicCheckout({
        purchaserCustomerId: "cust_001",
        paymentType: "card",
        items: [
          { kind: "session", sessionId: "sess_001", participantCustomerId: "cust_001" },
          { kind: "product", productId: "prd_003", participantCustomerId: "cust_001", quantity: 1 },
          { kind: "product", productId: "prd_015", participantCustomerId: "cust_001", quantity: 1 }
        ],
        promoCode: "WELCOME10",
        emailReceipt: true
      });
    });

    expect(result?.ok).toBe(true);
    expect(result?.receiptNumber).toBeTruthy();
    expect(state.transactions[0]?.receiptNumber).toBe(result?.receiptNumber);
    expect(state.transactions[0]?.items.some((item) => item.type === "program-registration")).toBe(true);
    expect(state.customerAccessRecords.some((entry) => entry.customerId === "cust_001" && entry.type === "membership" && entry.notes === "Monthly Membership")).toBe(true);
    expect(state.registrations.some((entry) => entry.sessionId === "sess_001" && entry.customerId === "cust_001")).toBe(true);
  });

  it("supports family registration for household participants", async () => {
    let state: ReturnType<typeof useCustomerState> | null = null;
    function Probe() {
      state = useCustomerState();
      return null;
    }
    render(
      <PublicTestProviders>
        <Probe />
      </PublicTestProviders>
    );
    if (!state) throw new Error("Missing state");

    await act(async () => {
      state!.signWaiverForCustomer({
        customerId: "cust_003",
        templateId: "wtpl_general",
        typedName: "Alex Rivera",
        signedByName: "Alex Rivera",
        source: "online"
      });
      state!.signWaiverForCustomer({
        customerId: "cust_004",
        templateId: "wtpl_general",
        typedName: "Alex Rivera",
        signedByName: "Alex Rivera",
        signedByCustomerId: "cust_003",
        signedByRelationship: "guardian",
        source: "online"
      });
    });
    let result: ReturnType<typeof state.completePublicCheckout> | undefined;
    await act(async () => {
      result = state!.completePublicCheckout({
        purchaserCustomerId: "cust_003",
        paymentType: "card",
        items: [
          { kind: "session", sessionId: "sess_001", participantCustomerId: "cust_003" },
          { kind: "session", sessionId: "sess_001", participantCustomerId: "cust_004" }
        ],
        emailReceipt: true
      });
    });

    expect(result?.ok).toBe(true);
    expect(state.registrations.some((entry) => entry.customerId === "cust_003" && entry.sessionId === "sess_001")).toBe(true);
    expect(state.registrations.some((entry) => entry.customerId === "cust_004" && entry.sessionId === "sess_001")).toBe(true);
  });

  it("routes full sessions to waitlist", async () => {
    let state: ReturnType<typeof useCustomerState> | null = null;
    function Probe() {
      state = useCustomerState();
      return null;
    }
    render(
      <PublicTestProviders>
        <Probe />
      </PublicTestProviders>
    );
    if (!state) throw new Error("Missing state");

    await act(async () => {
      state!.signWaiverForCustomer({
        customerId: "cust_001",
        templateId: "wtpl_general",
        typedName: "Maya Patel",
        signedByName: "Maya Patel",
        source: "online"
      });
      state!.updateSession({
        sessionId: "sess_001",
        programId: "prog_101",
        locationId: "loc_001",
        startsAt: "2026-05-21T11:00:00Z",
        endsAt: "2026-05-21T11:50:00Z",
        instructorName: "Iris Chen",
        instructorStaffId: "staff_004",
        capacity: 1,
        waitlistEnabled: true,
        title: "Morning Mobility Flow"
      });
    });
    let result: ReturnType<typeof state.completePublicCheckout> | undefined;
    await act(async () => {
      result = state!.completePublicCheckout({
        purchaserCustomerId: "cust_001",
        paymentType: "card",
        items: [{ kind: "session", sessionId: "sess_001", participantCustomerId: "cust_001" }],
        emailReceipt: true
      });
    });

    expect(result?.ok).toBe(true);
    expect(result?.waitlistedIds?.length).toBeGreaterThan(0);
    expect(state.registrations[0]?.status).toBe("waitlisted");
  });

  it("rejects invalid split payments", async () => {
    let state: ReturnType<typeof useCustomerState> | null = null;
    function Probe() {
      state = useCustomerState();
      return null;
    }
    render(
      <PublicTestProviders>
        <Probe />
      </PublicTestProviders>
    );
    if (!state) throw new Error("Missing state");

    await act(async () => {
      state!.signWaiverForCustomer({
        customerId: "cust_001",
        templateId: "wtpl_general",
        typedName: "Maya Patel",
        signedByName: "Maya Patel",
        source: "online"
      });
    });
    let result: ReturnType<typeof state.completePublicCheckout> | undefined;
    await act(async () => {
      result = state!.completePublicCheckout({
        purchaserCustomerId: "cust_001",
        paymentType: "split",
        splitBreakdown: [{ method: "cash", amountCents: 100 }],
        items: [{ kind: "product", productId: "prd_015", participantCustomerId: "cust_001", quantity: 1 }],
        emailReceipt: true
      });
    });

    expect(result?.ok).toBe(false);
    expect(result?.message).toMatch(/Split payment/i);
  });

  it("program registration panel routes into checkout", async () => {
    const user = userEvent.setup();
    const program = programs.find((entry) => entry.id === "prog_101");
    const session = classCampSessions.find((entry) => entry.id === "sess_001");
    if (!program || !session) throw new Error("Missing fixtures");

    render(
      <PublicTestProviders>
        <PublicRegistrationPanel orgSlug="summit" program={program} session={session} />
      </PublicTestProviders>
    );

    await user.click(screen.getByRole("button", { name: /Continue to Checkout/i }));
    expect(push).toHaveBeenCalledWith("/p/summit/checkout");
  });
});
