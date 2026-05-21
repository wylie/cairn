import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopBar } from "@/components/layout/top-bar";
import { CheckInList } from "@/components/checkins/checkin-list";
import { CustomerStateProvider } from "@/lib/state/customer-state";

describe("Global occupancy indicator", () => {
  it("appears in header and updates after check-in and check-out", async () => {
    const user = userEvent.setup();
    render(
      <CustomerStateProvider>
        <TopBar />
        <CheckInList />
      </CustomerStateProvider>
    );

    const initial = screen.getByTestId("header-occupancy").textContent;
    expect(initial).toContain("currently in");

    await user.type(screen.getByLabelText("Scan barcode, member ID, phone, email, or search name"), "Jordan");
    await user.click(screen.getByRole("button", { name: "Check In Jordan Kim" }));
    expect(screen.getByTestId("header-occupancy").textContent).not.toBe(initial);

    await user.click(screen.getByRole("button", { name: "Check Out Jordan Kim" }));
    expect(screen.getByTestId("header-occupancy").textContent).toContain("currently in");
  });
});
