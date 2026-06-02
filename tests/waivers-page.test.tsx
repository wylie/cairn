import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import WaiversPage from "@/app/(app)/waivers/page";
import { TopBar } from "@/components/layout/top-bar";
import { TestProviders } from "@/tests/test-providers";

vi.mock("next/navigation", () => ({
  usePathname: () => "/waivers",
  useSearchParams: () => new URLSearchParams(window.location.search)
}));

async function switchStaff(user: ReturnType<typeof userEvent.setup>, pin: string) {
  await user.click(screen.getByRole("button", { name: "Switch" }));
  await user.type(screen.getByLabelText("Staff PIN input"), pin);
  await user.click(screen.getByRole("button", { name: "Confirm" }));
}

describe("Waivers platform v1", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/waivers");
  });

  it("manager can open waivers management and create template", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <WaiversPage />
      </TestProviders>
    );

    await switchStaff(user, "2222");
    expect(screen.getByRole("heading", { name: "Waivers" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Name"), "Photography Release");
    await user.click(screen.getByRole("button", { name: "Create Template" }));
    expect(screen.getByRole("status")).toHaveTextContent(/Waiver template created: Photography Release/i);
    expect(screen.getAllByText("Photography Release").length).toBeGreaterThan(0);
  });

  it("supports waiver versioning and mock signing", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <WaiversPage />
      </TestProviders>
    );

    await switchStaff(user, "1111");
    await user.selectOptions(screen.getByLabelText("Template"), "wtpl_general");
    await user.clear(screen.getByLabelText("New Version"));
    await user.type(screen.getByLabelText("New Version"), "2.1");
    await user.click(screen.getByRole("button", { name: "Create New Version" }));
    expect(screen.getByRole("status")).toHaveTextContent(/Version 2.1 created/i);

    await user.selectOptions(screen.getByLabelText("Customer"), "cust_004");
    await user.selectOptions(screen.getByLabelText("Waiver Template"), "wtpl_general");
    await user.type(screen.getByLabelText("Typed Name"), "Sam Noaccess");
    await user.click(screen.getByRole("button", { name: "Mark Waiver Signed" }));
    expect(screen.getByRole("status")).toHaveTextContent(/General Facility Waiver signed/i);
  });

  it("front desk is blocked by manageWaivers permission gate", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <WaiversPage />
      </TestProviders>
    );

    await switchStaff(user, "3333");
    expect(screen.getByText("You do not have permission to perform this action.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Switch Staff" })).toBeInTheDocument();
  });

  it("applies waiver status filter from query params", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/waivers?status=expired");
    render(
      <TestProviders>
        <TopBar />
        <WaiversPage />
      </TestProviders>
    );

    await switchStaff(user, "2222");
    expect(screen.getByText("Filter: Expired")).toBeInTheDocument();
    expect(screen.getByText("Waiver Compliance")).toBeInTheDocument();
  });
});
