import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach } from "vitest";
import { vi } from "vitest";
import { CheckInList } from "@/components/checkins/checkin-list";
import { TopBar } from "@/components/layout/top-bar";
import { buildMembershipCardRecord } from "@/lib/memberships/cards";
import { TestProviders } from "@/tests/test-providers";

async function activateStaff(user: ReturnType<typeof userEvent.setup>, pin = "1111") {
  await user.click(screen.getAllByRole("button", { name: "Switch" })[0]);
  await user.type(screen.getByLabelText("Staff PIN input"), pin);
  await user.click(screen.getByRole("button", { name: "Confirm" }));
}

function mockMobileViewport() {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(max-width: 1023px)",
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

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
    await user.click(screen.getByRole("button", { name: "Check In" }));
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
    const href = profileLink.getAttribute("href") ?? "";
    expect(href).toContain("/customers/cust_001?");
    expect(href).toContain("from=");
    expect(href).toContain("returnTo=");
  });

  it("check-in rows render customer avatar fallback", () => {
    render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );

    expect(screen.getByLabelText("Maya Patel initials avatar")).toBeInTheDocument();
  });

  it("check-in search results show customer avatars", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );

    await user.type(screen.getByLabelText("Scan barcode, member ID, phone, email, or search name"), "Maya");
    expect(screen.getAllByLabelText(/Maya Patel (initials avatar|profile photo)/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Showing \d+ of \d+ matching customers/i)).toBeInTheDocument();
    const list = screen.getByRole("listbox", { name: "Customer search results" });
    expect(list.className).toContain("max-h-[50vh]");
    expect(list.className).toContain("md:max-h-[420px]");
  });

  it("finds customers by membership card number", async () => {
    const user = userEvent.setup();
    const card = buildMembershipCardRecord(
      { id: "cust_001", memberId: "M-1001" },
      { id: "acc_001" },
      "summit"
    );
    render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );

    await user.type(screen.getByLabelText("Scan barcode, member ID, phone, email, or search name"), card.membershipNumber);
    expect(screen.getByText("Maya Patel")).toBeInTheDocument();
  });

  it("currently checked-in roster shows customer avatars", () => {
    render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );

    expect(screen.getByLabelText(/Maya Patel (initials avatar|profile photo)/i)).toBeInTheDocument();
  });

  it("renders the mobile front-desk workspace shell on smaller screens", () => {
    mockMobileViewport();
    render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );

    expect(screen.getByTestId("checkin-mobile-workspace")).toBeInTheDocument();
    expect(screen.getByText(/Front Desk mode keeps search, active roster, and recent activity within thumb reach/i)).toBeInTheDocument();
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
    await user.click(screen.getByRole("button", { name: "Check In" }));

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
    await user.click(screen.getByRole("button", { name: "Check In" }));

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

    await activateStaff(user, "3333");
    await user.type(screen.getByLabelText("Scan barcode, member ID, phone, email, or search name"), "Sam Noaccess");
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Cannot Check In" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Sell Access" })).toBeInTheDocument();
  });
});

describe("CheckIn access methods", () => {
  it("supports family check-in for dependents when guardian can check in others", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );

    await activateStaff(user, "1111");
    await user.type(screen.getByLabelText("Scan barcode, member ID, phone, email, or search name"), "Alex");
    await user.keyboard("{Enter}");
    expect(screen.getByText("Checking in for household")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Sam Noaccess"));
    await user.click(screen.getByRole("button", { name: "Check In Selected" }));
    expect(screen.getByText(/Checked in 1 household member/i)).toBeInTheDocument();
  });

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
    await user.click(screen.getByRole("button", { name: "Check In" }));

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
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: "Check Out Maya Patel" }));
    await user.click(screen.getByRole("button", { name: "Check In" }));

    const rows = screen.getAllByTestId("checkin-row-cust_001");
    const activeRow = rows.find((row) => within(row).queryByText("Checked In"));
    expect(activeRow).toBeDefined();
    expect(within(activeRow as HTMLElement).getAllByText(/membership/i).length).toBeGreaterThan(0);
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
    await user.click(screen.getByRole("button", { name: "Check In" }));

    const row = screen.getByTestId("checkin-row-cust_005");
    expect(within(row).getAllByText(/day pass/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("status")).toHaveTextContent(/Checked in using Day Pass/i);
  });

  it("day pass is consumed and cannot be used again after checkout", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );

    await activateStaff(user, "1111");
    const search = screen.getByLabelText("Scan barcode, member ID, phone, email, or search name");
    await user.type(search, "Dana");
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: "Check In" }));
    await user.click(screen.getByRole("button", { name: "Check Out Dana Daypass" }));
    await user.clear(search);
    await user.type(search, "Dana");
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Cannot Check In" })).toBeDisabled();
    expect(screen.getAllByText(/expired|no valid access/i).length).toBeGreaterThan(0);
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
    await user.click(screen.getByRole("button", { name: "Cannot Check In" }));

    expect(screen.getByText(/No valid access found|no valid access method/i)).toBeInTheDocument();
    expect(screen.queryByTestId("checkin-row-cust_004")).not.toBeInTheDocument();
  });
});

describe("Check-in desk workflow", () => {
  it("search input auto-focuses and Enter selects a customer", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );
    const input = screen.getByLabelText("Scan barcode, member ID, phone, email, or search name");
    expect(input).toHaveFocus();
    await user.type(input, "Jordan");
    await user.keyboard("{Enter}");
    expect(screen.getAllByText("Jordan Kim").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Check In" })).toBeInTheDocument();
  });

  it("already checked-in customers show disabled state", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );
    await user.type(screen.getByLabelText("Scan barcode, member ID, phone, email, or search name"), "Maya");
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Already Checked In" })).toBeDisabled();
  });

  it("post-check-in clears search and re-focuses input", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );
    await activateStaff(user, "1111");
    const input = screen.getByLabelText("Scan barcode, member ID, phone, email, or search name");
    await user.type(input, "Jordan");
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: "Check In" }));
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
  });

  it("shows manager override when blocked and override permission is present", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );
    await activateStaff(user, "2222");
    await user.type(screen.getByLabelText("Scan barcode, member ID, phone, email, or search name"), "Sam");
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Manager Override + Check In" })).toBeInTheDocument();
    expect(screen.getByLabelText("Override reason")).toBeInTheDocument();
  });

  it("shows ready status card messaging for eligible customers", async () => {
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
    expect(screen.getByText("Ready to check in")).toBeInTheDocument();
    expect(screen.getAllByText(/Using Punch Pass/i).length).toBeGreaterThan(0);
  });

  it("shows blocked waiver messaging for waiver-missing customer", async () => {
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
    expect(screen.getByText("Cannot check in")).toBeInTheDocument();
    expect(screen.getAllByText(/Waiver missing/i).length).toBeGreaterThan(0);
  });

  it("shows selected customer check-in timeline context", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );
    await user.type(screen.getByLabelText("Scan barcode, member ID, phone, email, or search name"), "Maya");
    await user.keyboard("{Enter}");
    expect(screen.getByText("Check-in timeline")).toBeInTheDocument();
  });

  it("shows clickable occupancy navigation and recent activity section", () => {
    render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );
    expect(screen.getByTestId("occupancy-count")).toHaveAttribute("href", "/check-in#current-roster");
    expect(screen.getByText("Recent check-ins")).toBeInTheDocument();
  });

  it("supports slash keyboard shortcut to focus search", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );
    await user.tab();
    await user.keyboard("/");
    expect(screen.getByLabelText("Scan barcode, member ID, phone, email, or search name")).toHaveFocus();
  });

  it("supports Cmd/Ctrl+Enter shortcut to check in selected eligible customer", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );
    await activateStaff(user, "1111");
    const input = screen.getByLabelText("Scan barcode, member ID, phone, email, or search name");
    await user.type(input, "Jordan");
    await user.keyboard("{Enter}");
    await user.keyboard("{Control>}{Enter}{/Control}");
    expect(screen.getByRole("status")).toHaveTextContent(/Check-in recorded for Jordan Kim/i);
  });

  it("enforces dependent restriction with guardian-required messaging", async () => {
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
    expect(screen.getByText(/Minor requires guardian/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cannot Check In" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Manager Override + Check In" })).not.toBeInTheDocument();
  });

  it("shows undo after successful check-in", async () => {
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
    await user.click(screen.getByRole("button", { name: "Check In" }));
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByRole("status")).toHaveTextContent(/Undo applied/i);
  });
});
