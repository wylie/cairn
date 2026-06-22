import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { HouseholdsWorkspace } from "@/components/households/households-workspace";
import { TopBar } from "@/components/layout/top-bar";
import { TestProviders } from "@/tests/test-providers";

vi.mock("next/navigation", () => ({
  usePathname: () => "/households",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn()
  })
}));

vi.mock("@/app/(app)/households/actions", () => ({
  createPersistedHouseholdAction: vi.fn(),
  updatePersistedHouseholdAction: vi.fn(),
  deletePersistedHouseholdAction: vi.fn()
}));

async function activateStaff(user: ReturnType<typeof userEvent.setup>, pin = "2222") {
  await user.click(screen.getAllByRole("button", { name: "Switch" })[0]);
  await user.type(screen.getByLabelText("Staff PIN input"), pin);
  await user.click(screen.getByRole("button", { name: "Confirm" }));
}

describe("Households workspace", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) => store.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => store.set(key, value)),
        removeItem: vi.fn((key: string) => store.delete(key)),
        clear: vi.fn(() => store.clear())
      }
    });
  });

  it("renders mixed adult/child household overview and health sections", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <HouseholdsWorkspace pathname="/households" currentSearch="" />
      </TestProviders>
    );

    await activateStaff(user);

    expect(screen.getByTestId("households-workspace")).toBeInTheDocument();
    expect(screen.getAllByText("Rivera Family").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("household-members-section")).toBeInTheDocument();
    expect(screen.getByLabelText("household-relationships-section")).toBeInTheDocument();
    expect(screen.getByLabelText("household-access-section")).toBeInTheDocument();
    expect(screen.getByLabelText("household-waivers-section")).toBeInTheDocument();
    expect(screen.getByLabelText("household-billing-section")).toBeInTheDocument();
    expect(screen.getByLabelText("household-purchases-section")).toBeInTheDocument();
    expect(screen.getByLabelText("household-communications-section")).toBeInTheDocument();
    expect(screen.getByText(/Primary Adult/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Child/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /upload photo|replace photo/i })).toBeInTheDocument();
  });

  it("shows membership coverage, registrations, visits, and communication history", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <HouseholdsWorkspace pathname="/households" currentSearch="" />
      </TestProviders>
    );

    await activateStaff(user);

    expect(screen.getByLabelText("household-memberships-section")).toHaveTextContent(/Family Membership|Couple Membership|Parent \+ Child|Custom Household Membership/i);
    expect(screen.getByLabelText("household-registrations-section")).toBeInTheDocument();
    expect(screen.getByLabelText("household-checkin-section")).toBeInTheDocument();
    expect(screen.getByLabelText("household-timeline-section")).toBeInTheDocument();
    expect(screen.getByLabelText("household-dashboard-widgets")).toHaveTextContent("Households Missing Waivers");
    expect(screen.getByLabelText("household-dashboard-widgets")).toHaveTextContent("Recent Household Activity");
  });

  it("supports household check-in and billing visibility", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <HouseholdsWorkspace pathname="/households" currentSearch="" />
      </TestProviders>
    );

    await activateStaff(user);

    const membersSection = screen.getByLabelText("household-members-section");
    const checkboxes = within(membersSection).getAllByRole("checkbox");
    expect(checkboxes.length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Check In Household" }));
    expect(screen.getByRole("status")).toHaveTextContent(/Checked in|could not be checked in|guardian-enabled/i);
    expect(screen.getByLabelText("household-billing-section")).toHaveTextContent(/Outstanding balances|Upcoming renewals|stored payment methods/i);
  });

  it("supports single-person and blended household search scenarios", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <HouseholdsWorkspace pathname="/households" currentSearch="" />
      </TestProviders>
    );

    await activateStaff(user);

    await user.type(screen.getByLabelText("Search households"), "Brooks Household");
    expect(screen.getAllByText("Brooks Household").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1 members/).length).toBeGreaterThan(0);

    await user.clear(screen.getByLabelText("Search households"));
    await user.type(screen.getByLabelText("Search households"), "M-1006");
    expect(screen.getAllByText("Patel-James Household").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/2 members/).length).toBeGreaterThan(0);
  });

  it("renders first-class detail navigation and jump links on the household detail route", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <HouseholdsWorkspace initialHouseholdId="hh_001" pathname="/households/hh_001" currentSearch="" />
      </TestProviders>
    );

    await activateStaff(user);

    expect(screen.getByRole("link", { name: "← Back to Households" })).toHaveAttribute("href", "/households");
    expect(screen.getByLabelText("household-jump-links")).toHaveTextContent("Members");
    expect(screen.getByLabelText("household-jump-links")).toHaveTextContent("Billing");
    expect(screen.getByLabelText("household-jump-links")).toHaveTextContent("Timeline");
  });
});
