import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CheckInList } from "@/components/checkins/checkin-list";
import { TopBar } from "@/components/layout/top-bar";
import { TestProviders } from "@/tests/test-providers";

async function activateStaff(user: ReturnType<typeof userEvent.setup>, pin = "1111") {
  await user.click(screen.getAllByRole("button", { name: "Switch" })[0]);
  await user.type(screen.getByLabelText("Staff PIN input"), pin);
  await user.click(screen.getByRole("button", { name: "Confirm" }));
}

describe("CheckInList date behavior", () => {
  it("search input appears on Today", () => {
    render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );

    expect(screen.getByLabelText("Scan barcode, member ID, phone, email, or search name")).toBeInTheDocument();
  });

  it("search input is hidden on previous days", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );

    await user.click(screen.getByRole("button", { name: "Previous Day" }));
    expect(screen.queryByLabelText("Scan barcode, member ID, phone, email, or search name")).not.toBeInTheDocument();
  });

  it("helper message appears on historical days", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );

    await user.click(screen.getByRole("button", { name: "Previous Day" }));
    expect(screen.getByText("Historical check-in logs are read-only.")).toBeInTheDocument();
  });

  it("today view still allows check-in and check-out", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );

    await activateStaff(user, "1111");
    await user.type(screen.getByLabelText("Scan barcode, member ID, phone, email, or search name"), "Jordan");
    await user.keyboard("{Enter}");
    expect(screen.getByText(/Check-in recorded for Jordan Kim/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Check Out Jordan Kim" }));
    const row = screen.getByTestId("checkin-row-cust_002");
    expect(within(row).getByText("Checked Out")).toBeInTheDocument();
  });

  it("check-in rows include a large customer-profile link target", () => {
    render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );

    const row = screen.getByTestId("checkin-row-cust_001");
    const profileLink = within(row).getByRole("link", { name: /open customer profile for maya patel/i });
    expect(profileLink).toHaveAttribute("href", "/customers/cust_001");
  });
});

describe("Workstation staff mode", () => {
  it("active staff appears in header", () => {
    render(
      <TestProviders>
        <TopBar />
      </TestProviders>
    );

    expect(screen.getByTestId("active-staff-label")).toHaveTextContent("No staff selected");
  });

  it("staff can switch by valid PIN", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
      </TestProviders>
    );

    await user.click(screen.getByRole("button", { name: "Switch" }));
    await user.type(screen.getByLabelText("Staff PIN input"), "3333");
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(screen.getByTestId("active-staff-label")).toHaveTextContent("Sam Rivera");
  });

  it("invalid PIN shows error", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
      </TestProviders>
    );

    await user.click(screen.getByRole("button", { name: "Switch" }));
    await user.type(screen.getByLabelText("Staff PIN input"), "9999");
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/invalid pin/i);
  });

  it("no active staff triggers PIN prompt on protected action", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );

    await user.type(screen.getByLabelText("Scan barcode, member ID, phone, email, or search name"), "Jordan");
    await user.keyboard("{Enter}");

    expect(screen.getByRole("dialog", { name: "Staff PIN" })).toBeInTheDocument();
  });

  it("check-in records active staff", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );

    await activateStaff(user, "3333");
    await user.type(screen.getByLabelText("Scan barcode, member ID, phone, email, or search name"), "Jordan");
    await user.keyboard("{Enter}");

    const row = screen.getByTestId("checkin-row-cust_002");
    expect(within(row).getByText(/Checked in by: Sam Rivera/i)).toBeInTheDocument();
    expect(within(row).queryByText(/Checked in by: Unknown/i)).not.toBeInTheDocument();
  });

  it("check-out records active staff", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );

    await activateStaff(user, "3333");
    await user.click(screen.getByRole("button", { name: "Check Out Maya Patel" }));

    const row = screen.getByTestId("checkin-row-cust_001");
    expect(within(row).getByText(/Checked out by: Sam Rivera/i)).toBeInTheDocument();
  });

  it("staff without permission cannot perform protected action", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );

    await activateStaff(user, "4444");
    await user.click(screen.getByRole("button", { name: "Check Out Maya Patel" }));

    expect(screen.getByRole("alert")).toHaveTextContent("You do not have permission to perform this action.");
  });

  it("blocked action offers Switch Staff", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );

    await activateStaff(user, "4444");
    await user.click(screen.getByRole("button", { name: "Check Out Maya Patel" }));

    expect(screen.getAllByRole("button", { name: "Switch Staff" }).length).toBeGreaterThan(0);
  });

  it("no-valid-access shows sell access path", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );

    await activateStaff(user, "2222");
    await user.type(screen.getByLabelText("Scan barcode, member ID, phone, email, or search name"), "Sam Noaccess");
    await user.keyboard("{Enter}");
    expect(screen.getByRole("alert")).toHaveTextContent(/no valid access method/i);
    expect(screen.getByRole("button", { name: "Sell Access" })).toBeInTheDocument();
  });
});

describe("CheckIn access methods", () => {
  it("multi-visit pass check-in records punch usage and decreases remaining punches", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );

    await activateStaff(user, "1111");
    await user.type(screen.getByLabelText("Scan barcode, member ID, phone, email, or search name"), "Jordan");
    await user.keyboard("{Enter}");

    const row = screen.getByTestId("checkin-row-cust_002");
    expect(within(row).getByText(/multi visit pass/i)).toBeInTheDocument();
    expect(within(row).getByText(/Punches used: 1/i)).toBeInTheDocument();
    expect(within(row).getByText(/Remaining: 6/i)).toBeInTheDocument();
  });

  it("membership check-in does not decrement punches", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );

    await activateStaff(user, "1111");
    const search = screen.getByLabelText("Scan barcode, member ID, phone, email, or search name");
    await user.type(search, "Maya");
    await user.click(screen.getByRole("button", { name: "Check Out Maya Patel" }));
    await user.clear(search);
    await user.type(search, "Maya");
    await user.keyboard("{Enter}");

    const rows = screen.getAllByTestId("checkin-row-cust_001");
    const activeRow = rows.find((row) => within(row).queryByText("Checked In"));
    expect(activeRow).toBeDefined();
    expect(within(activeRow as HTMLElement).getByText(/membership/i)).toBeInTheDocument();
    expect(within(activeRow as HTMLElement).queryByText(/Punches used/i)).not.toBeInTheDocument();
  });

  it("day pass check-in records day pass entry", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );

    await activateStaff(user, "1111");
    await user.type(screen.getByLabelText("Scan barcode, member ID, phone, email, or search name"), "Dana");
    await user.keyboard("{Enter}");

    const row = screen.getByTestId("checkin-row-cust_005");
    expect(within(row).getAllByText(/day pass/i).length).toBeGreaterThan(0);
  });

  it("customer with no valid access cannot check in", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );

    await activateStaff(user, "3333");
    await user.type(screen.getByLabelText("Scan barcode, member ID, phone, email, or search name"), "Sam");
    await user.keyboard("{Enter}");

    expect(screen.getByRole("alert")).toHaveTextContent(/no valid access method/i);
    expect(screen.queryByTestId("checkin-row-cust_004")).not.toBeInTheDocument();
  });
});
