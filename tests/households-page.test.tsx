import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import HouseholdsPage from "@/app/(app)/households/page";
import { TopBar } from "@/components/layout/top-bar";
import { TestProviders } from "@/tests/test-providers";

vi.mock("next/navigation", () => ({
  usePathname: () => "/households",
  useSearchParams: () => new URLSearchParams()
}));

async function activateStaff(user: ReturnType<typeof userEvent.setup>, pin = "2222") {
  await user.click(screen.getAllByRole("button", { name: "Switch" })[0]);
  await user.type(screen.getByLabelText("Staff PIN input"), pin);
  await user.click(screen.getByRole("button", { name: "Confirm" }));
}

describe("Households workspace", () => {
  it("renders mixed adult/child household overview and health sections", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <HouseholdsPage />
      </TestProviders>
    );

    await activateStaff(user);

    expect(screen.getByTestId("households-workspace")).toBeInTheDocument();
    expect(screen.getAllByText("Rivera Family").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("household-members-section")).toBeInTheDocument();
    expect(screen.getByLabelText("household-waivers-section")).toBeInTheDocument();
    expect(screen.getByLabelText("household-billing-section")).toBeInTheDocument();
    expect(screen.getByLabelText("household-communications-section")).toBeInTheDocument();
    expect(screen.getByText("Primary Adult")).toBeInTheDocument();
    expect(screen.getByText("Child")).toBeInTheDocument();
  });

  it("shows membership coverage, registrations, visits, and communication history", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <HouseholdsPage />
      </TestProviders>
    );

    await activateStaff(user);

    expect(screen.getByLabelText("household-memberships-section")).toHaveTextContent(/Family Membership|Couple Membership|Parent \+ Child|Custom Household Membership/i);
    expect(screen.getByLabelText("household-registrations-section")).toBeInTheDocument();
    expect(screen.getByLabelText("household-checkin-section")).toBeInTheDocument();
    expect(screen.getByLabelText("household-timeline-section")).toBeInTheDocument();
    expect(screen.getByLabelText("household-dashboard-widgets")).toHaveTextContent("Households Missing Waivers");
  });

  it("supports household check-in and billing visibility", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <HouseholdsPage />
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
});
