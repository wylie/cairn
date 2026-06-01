import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopBar } from "@/components/layout/top-bar";
import { CheckInList } from "@/components/checkins/checkin-list";
import { TestProviders } from "@/tests/test-providers";

describe("Global occupancy indicator", () => {
  it("appears in header and updates after check-in and check-out", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );

    const initial = screen.getByTestId("header-occupancy").textContent;
    expect(initial).toContain("currently in");

    await user.click(screen.getByRole("button", { name: "Switch" }));
    await user.type(screen.getByLabelText("Staff PIN input"), "1111");
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    await user.type(screen.getByLabelText("Scan barcode, member ID, phone, email, or search name"), "Jordan");
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: "Check In" }));
    expect(screen.getByTestId("header-occupancy").textContent).not.toBe(initial);

    await user.click(screen.getByRole("button", { name: "Check Out Jordan Kim" }));
    expect(screen.getByTestId("header-occupancy").textContent).toContain("currently in");
  });

  it("links to check-in and is keyboard accessible", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
      </TestProviders>
    );

    const link = screen.getByRole("link", { name: "View current check-ins" });
    expect(link).toHaveAttribute("href", "/o/summit/check-in");
    await user.tab();
    expect(link).toHaveFocus();
  });
});
