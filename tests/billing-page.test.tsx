import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import BillingPage from "@/app/(app)/billing/page";
import { TopBar } from "@/components/layout/top-bar";
import { TestProviders } from "@/tests/test-providers";

vi.mock("next/navigation", () => ({
  usePathname: () => "/o/summit/billing",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() })
}));

async function activateStaff(user: ReturnType<typeof userEvent.setup>, pin = "2222") {
  await user.click(screen.getAllByRole("button", { name: "Switch" })[0]);
  await user.type(screen.getByLabelText("Staff PIN input"), pin);
  await user.click(screen.getByRole("button", { name: "Confirm" }));
}

describe("billing workspace", () => {
  it("renders billing metrics and sections for manager access", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <BillingPage />
      </TestProviders>
    );

    await activateStaff(user);

    expect(screen.getByTestId("billing-workspace")).toBeInTheDocument();
    expect(screen.getByText("Revenue Today")).toBeInTheDocument();
    expect(screen.getByLabelText("billing-accounts-section")).toBeInTheDocument();
    expect(screen.getByLabelText("billing-invoices-section")).toBeInTheDocument();
    expect(screen.getByLabelText("billing-statements-section")).toBeInTheDocument();
  });

  it("supports credit, statement, and renewal actions", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <BillingPage />
      </TestProviders>
    );

    await activateStaff(user);

    await user.click(screen.getAllByRole("button", { name: "Add Credit" })[0]);
    expect(screen.getByRole("status")).toHaveTextContent(/Billing credit updated/i);

    await user.click(screen.getAllByRole("button", { name: "Create Statement" })[0]);
    expect(screen.getByRole("status")).toHaveTextContent(/Billing statement created/i);

    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(screen.getByRole("status")).toHaveTextContent(/Renewal retried successfully/i);
  });
});
