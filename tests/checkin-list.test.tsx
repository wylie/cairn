import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CheckInList } from "@/components/checkins/checkin-list";
import { CustomerStateProvider } from "@/lib/state/customer-state";

describe("CheckInList date behavior", () => {
  it("search input appears on Today", () => {
    render(
      <CustomerStateProvider>
        <CheckInList />
      </CustomerStateProvider>
    );

    expect(screen.getByLabelText("Scan barcode, member ID, phone, email, or search name")).toBeInTheDocument();
  });

  it("search input is hidden on previous days", async () => {
    const user = userEvent.setup();
    render(
      <CustomerStateProvider>
        <CheckInList />
      </CustomerStateProvider>
    );

    await user.click(screen.getByRole("button", { name: "Previous Day" }));
    expect(screen.queryByLabelText("Scan barcode, member ID, phone, email, or search name")).not.toBeInTheDocument();
  });

  it("helper message appears on historical days", async () => {
    const user = userEvent.setup();
    render(
      <CustomerStateProvider>
        <CheckInList />
      </CustomerStateProvider>
    );

    await user.click(screen.getByRole("button", { name: "Previous Day" }));
    expect(screen.getByText("Historical check-in logs are read-only.")).toBeInTheDocument();
  });

  it("today view still allows check-in and check-out", async () => {
    const user = userEvent.setup();
    render(
      <CustomerStateProvider>
        <CheckInList />
      </CustomerStateProvider>
    );

    await user.type(screen.getByLabelText("Scan barcode, member ID, phone, email, or search name"), "Jordan");
    await user.click(screen.getByRole("button", { name: "Check In Jordan Kim" }));
    expect(screen.getByText(/Check-in recorded for Jordan Kim/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Check Out Jordan Kim" }));
    const row = screen.getByTestId("checkin-row-cust_002");
    expect(within(row).getByText("Checked Out")).toBeInTheDocument();
  });

  it("check-in rows include a large customer-profile link target", () => {
    render(
      <CustomerStateProvider>
        <CheckInList />
      </CustomerStateProvider>
    );

    const row = screen.getByTestId("checkin-row-cust_001");
    const profileLink = within(row).getByRole("link", { name: /open customer profile for maya patel/i });
    expect(profileLink).toHaveAttribute("href", "/customers/cust_001");
  });
});

describe("CheckIn access methods", () => {
  it("multi-visit pass check-in records punch usage and decreases remaining punches", async () => {
    const user = userEvent.setup();
    render(
      <CustomerStateProvider>
        <CheckInList />
      </CustomerStateProvider>
    );

    await user.type(screen.getByLabelText("Scan barcode, member ID, phone, email, or search name"), "Jordan");
    await user.click(screen.getByRole("button", { name: "Check In Jordan Kim" }));

    const row = screen.getByTestId("checkin-row-cust_002");
    expect(within(row).getByText(/multi visit pass/i)).toBeInTheDocument();
    expect(within(row).getByText(/Punches used: 1/i)).toBeInTheDocument();
    expect(within(row).getByText(/Remaining: 6/i)).toBeInTheDocument();
  });

  it("membership check-in does not decrement punches", async () => {
    const user = userEvent.setup();
    render(
      <CustomerStateProvider>
        <CheckInList />
      </CustomerStateProvider>
    );

    const search = screen.getByLabelText("Scan barcode, member ID, phone, email, or search name");
    await user.type(search, "Maya");
    await user.click(screen.getByRole("button", { name: "Check Out Maya Patel" }));
    await user.clear(search);
    await user.type(search, "Maya");
    await user.click(screen.getByRole("button", { name: "Check In Maya Patel" }));

    const rows = screen.getAllByTestId("checkin-row-cust_001");
    const activeRow = rows.find((row) => within(row).queryByText("Checked In"));
    expect(activeRow).toBeDefined();
    expect(within(activeRow as HTMLElement).getByText(/membership/i)).toBeInTheDocument();
    expect(within(activeRow as HTMLElement).queryByText(/Punches used/i)).not.toBeInTheDocument();
  });

  it("day pass check-in records day pass entry", async () => {
    const user = userEvent.setup();
    render(
      <CustomerStateProvider>
        <CheckInList />
      </CustomerStateProvider>
    );

    await user.type(screen.getByLabelText("Scan barcode, member ID, phone, email, or search name"), "Dana");
    await user.click(screen.getByRole("button", { name: "Check In Dana Daypass" }));

    const row = screen.getByTestId("checkin-row-cust_005");
    expect(within(row).getAllByText(/day pass/i).length).toBeGreaterThan(0);
  });

  it("customer with no valid access cannot check in", async () => {
    const user = userEvent.setup();
    render(
      <CustomerStateProvider>
        <CheckInList />
      </CustomerStateProvider>
    );

    await user.type(screen.getByLabelText("Scan barcode, member ID, phone, email, or search name"), "Sam");
    await user.click(screen.getByRole("button", { name: "Check In Sam Noaccess" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/no valid access method/i);
    expect(screen.queryByTestId("checkin-row-cust_004")).not.toBeInTheDocument();
  });
});
