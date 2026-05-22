import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsPage from "@/app/(app)/settings/page";
import { TopBar } from "@/components/layout/top-bar";
import { TestProviders } from "@/tests/test-providers";

describe("Workstation permissions", () => {
  it("front desk cannot access restricted settings if permission is disallowed", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <SettingsPage />
      </TestProviders>
    );

    await user.click(screen.getByRole("button", { name: "Switch" }));
    await user.type(screen.getByLabelText("Staff PIN input"), "3333");
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(screen.getByText("You do not have permission to perform this action.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Switch Staff" })).toBeInTheDocument();
  });
});
