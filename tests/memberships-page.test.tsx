import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MembershipsWorkspacePage from "@/app/(app)/memberships/page";
import { TopBar } from "@/components/layout/top-bar";
import { TestProviders } from "@/tests/test-providers";

async function activateStaff(user: ReturnType<typeof userEvent.setup>, pin = "2222") {
  await user.click(screen.getAllByRole("button", { name: "Switch" })[0]);
  await user.type(screen.getByLabelText("Staff PIN input"), pin);
  await user.click(screen.getByRole("button", { name: "Confirm" }));
}

describe("Memberships workspace", () => {
  it("renders dashboard metrics and membership list", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <MembershipsWorkspacePage />
      </TestProviders>
    );

    await activateStaff(user, "2222");

    expect(screen.getByTestId("memberships-workspace")).toBeInTheDocument();
    expect(screen.getAllByText("Active memberships").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("membership-list")).toBeInTheDocument();
    expect(screen.getByLabelText("membership-detail-panel")).toBeInTheDocument();
  });

  it("filters memberships by search and status", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <MembershipsWorkspacePage />
      </TestProviders>
    );

    await activateStaff(user, "2222");

    await user.type(screen.getByLabelText("Search memberships"), "maya");
    expect(screen.getAllByText(/Maya/i).length).toBeGreaterThan(0);

    await user.selectOptions(screen.getByLabelText("Membership status filter"), "frozen");
    expect(screen.getByLabelText("membership-list")).toBeInTheDocument();
  });

  it("supports renewal and freeze/cancel confirmation workflows", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <MembershipsWorkspacePage />
      </TestProviders>
    );

    await activateStaff(user, "2222");

    await user.click(screen.getByRole("button", { name: "Renew Membership" }));
    expect(screen.getByRole("status")).toHaveTextContent(/Access record updated|Renewed/i);

    await user.click(screen.getByRole("button", { name: "Freeze Membership" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(screen.getByRole("status")).toHaveTextContent(/Access record updated/i);

    await user.click(screen.getByRole("button", { name: "Cancel Membership" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows failed renewals actions", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <MembershipsWorkspacePage />
      </TestProviders>
    );

    await activateStaff(user, "2222");

    const failedSection = screen.getByLabelText("failed-renewals-section");
    expect(within(failedSection).getByText("Failed Renewals")).toBeInTheDocument();
    const hasRows = within(failedSection).queryByRole("button", { name: "Contact Customer" });
    if (hasRows) {
      expect(hasRows).toBeInTheDocument();
    } else {
      expect(within(failedSection).getByText("No failed renewals.")).toBeInTheDocument();
    }
  });

  it("renders household covered members list", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <MembershipsWorkspacePage />
      </TestProviders>
    );

    await activateStaff(user, "2222");

    expect(screen.getByLabelText("covered-members")).toBeInTheDocument();
  });
});
