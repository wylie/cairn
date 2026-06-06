import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach } from "vitest";
import { vi } from "vitest";
import PosPage from "@/app/(app)/pos/page";
import { CheckInList } from "@/components/checkins/checkin-list";
import { CustomerList } from "@/components/customers/customer-list";
import { TopBar } from "@/components/layout/top-bar";
import { TestProviders } from "@/tests/test-providers";

async function activateStaff(user: ReturnType<typeof userEvent.setup>, pin = "2222") {
  await user.click(screen.getAllByRole("button", { name: "Switch" })[0]);
  const input = screen.getByLabelText("Staff PIN input");
  await user.clear(input);
  await user.type(input, pin);
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

async function completeNewCustomerWizardInPos(
  user: ReturnType<typeof userEvent.setup>,
  input: { firstName: string; lastName: string }
) {
  await user.type(screen.getByLabelText("First name"), input.firstName);
  await user.type(screen.getByLabelText("Last name"), input.lastName);
  await user.type(screen.getByLabelText("Date of birth"), "1990-01-10");
  await user.click(screen.getByRole("button", { name: "Next" }));
  await user.type(screen.getByLabelText("Phone"), "(212) 555-2000");
  await user.click(screen.getByRole("button", { name: "Next" }));
  await user.type(screen.getByLabelText("Address line 1"), "22 State St");
  await user.type(screen.getByLabelText("City"), "New York");
  await user.type(screen.getByLabelText("State"), "NY");
  await user.type(screen.getByLabelText("ZIP/postal code"), "10002");
  await user.click(screen.getByRole("button", { name: "Next" }));
  await user.type(screen.getByLabelText("Emergency contact name"), "Pat Contact");
  await user.type(screen.getByLabelText("Emergency contact phone"), "(212) 555-3000");
  await user.click(screen.getByRole("button", { name: "Next" }));
  await user.click(screen.getByLabelText("Needs waiver"));
  await user.click(screen.getByRole("button", { name: "Next" }));
  await user.click(screen.getByRole("button", { name: "Create Customer" }));
}

describe("POS page", () => {
  it("applies member pricing for active members in cart", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <PosPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    await user.type(screen.getByLabelText("Search customer"), "Maya Patel");
    await user.keyboard("{ArrowDown}{Enter}");
    await user.click(screen.getByRole("button", { name: "Add Class Drop-In" }));

    expect(screen.getByText(/Member price: \$10.00/i)).toBeInTheDocument();
  });

  it("renders mobile POS guidance on smaller screens", async () => {
    const user = userEvent.setup();
    mockMobileViewport();
    render(
      <TestProviders>
        <TopBar />
        <PosPage />
      </TestProviders>
    );

    await activateStaff(user, "2222");
    expect(screen.getByTestId("pos-mobile-workspace")).toBeInTheDocument();
    expect(screen.getByText(/Mobile POS keeps customer lookup, products, and checkout in a single vertical flow/i)).toBeInTheDocument();
  });

  it("keeps Complete + Check In button text contained with multiline-safe styling", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <PosPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");
    const button = screen.getByRole("button", { name: "Complete + Check In" });
    expect(button.className).toContain("whitespace-normal");
    expect(button.className).toContain("leading-tight");
  });

  it("supports purchasing for household member or entire household", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <PosPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    await user.type(screen.getByLabelText("Search customer"), "Alex");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(screen.getByText("Purchasing for")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Household Member" }));
    expect(screen.getByLabelText("Purchase for household member")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Purchase for household member"), "cust_004");
    await user.click(screen.getByRole("button", { name: "Entire Household" }));
    expect(screen.getByRole("button", { name: "Entire Household" })).toBeInTheDocument();
  });

  it("selling one day pass creates one post-sale check-in slot assigned to purchasing customer", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <PosPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    await user.type(screen.getByLabelText("Search customer"), "Sam");
    await user.keyboard("{ArrowDown}{Enter}");
    await user.click(screen.getByRole("button", { name: "Add Day Pass" }));
    await user.click(screen.getByRole("button", { name: "Complete" }));

    expect(screen.getByRole("dialog", { name: "Post-sale check-in" })).toBeInTheDocument();
    expect(screen.getByText(/Assign Check-ins|Check In Now/i)).toBeInTheDocument();
    expect(screen.getByText(/1 eligible check-in/i)).toBeInTheDocument();
    expect(screen.getByText(/Slot 1: Day Pass/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Sam Noaccess/i).length).toBeGreaterThan(0);
  });

  it("selling two day passes creates two slots and extra slot requires assignment", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <PosPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    await user.type(screen.getByLabelText("Search customer"), "Dana");
    await user.keyboard("{ArrowDown}{Enter}");
    await user.click(screen.getByRole("button", { name: "Add Day Pass" }));
    await user.click(screen.getByRole("button", { name: "Add Day Pass" }));
    await user.click(screen.getByRole("button", { name: "Complete" }));

    expect(screen.getByText(/2 eligible check-in/i)).toBeInTheDocument();
    expect(screen.getByText(/Slot 2: Day Pass/i)).toBeInTheDocument();
    expect(screen.getByText(/Create or select a customer to check in\./i)).toBeInTheDocument();
    expect(screen.getByText(/Slot 2: Day Pass/i)).toBeInTheDocument();
    expect(screen.getByText(/Create or select a customer to check in\./i)).toBeInTheDocument();
  });

  it("staff can assign another customer to extra slot and check in from sale slot", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <PosPage />
        <CheckInList />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    await user.type(screen.getByLabelText("Search customer"), "Dana");
    await user.keyboard("{ArrowDown}{Enter}");
    await user.click(screen.getByRole("button", { name: "Add Day Pass" }));
    await user.click(screen.getByRole("button", { name: "Add Day Pass" }));
    await user.click(screen.getByRole("button", { name: "Complete" }));

    await user.type(screen.getByLabelText("Assign customer for slot 2"), "Maya");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(screen.getAllByText(/Maya Patel/i).length).toBeGreaterThan(0);

    const slotButtons = screen.getAllByRole("button", { name: "Check In" });
    await user.click(slotButtons[1]);
    expect(screen.getByTestId("header-occupancy")).toHaveTextContent("2 currently in");
    expect(screen.getByTestId("checkin-row-cust_001")).toBeInTheDocument();
  });

  it("missing waiver shows warning and blocks post-sale slot check-in", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <PosPage />
      </TestProviders>
    );
    await activateStaff(user, "3333");

    await user.type(screen.getByLabelText("Search customer"), "Sam");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(screen.getByText(/Waiver missing or expired/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add Day Pass" }));
    await user.click(screen.getByRole("button", { name: "Complete" }));
    expect(screen.getByText(/Sale completed for Sam Noaccess/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Manager Required" })).toBeDisabled();
    expect(screen.getByText(/Waiver required before check-in/i)).toBeInTheDocument();
    expect(screen.getByText(/Missing or expired waiver/i)).toBeInTheDocument();
  });

  it("marking waiver signed in post-sale modal enables check-in", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <PosPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    await user.type(screen.getByLabelText("Search customer"), "Sam");
    await user.keyboard("{ArrowDown}{Enter}");
    await user.click(screen.getByRole("button", { name: "Add Day Pass" }));
    await user.click(screen.getByRole("button", { name: "Complete" }));

    expect(screen.getByRole("button", { name: "Manager Override + Check In" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mark Waiver Signed" }));
    expect(screen.getByText(/Waiver marked valid/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Check In" }).some((button) => !button.hasAttribute("disabled"))).toBe(true);
  });

  it("staff with override permission can override waiver block in post-sale check-in", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <PosPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    await user.type(screen.getByLabelText("Search customer"), "Sam");
    await user.keyboard("{ArrowDown}{Enter}");
    await user.click(screen.getByRole("button", { name: "Add Day Pass" }));
    await user.click(screen.getByRole("button", { name: "Complete" }));

    const overrideButton = screen.getByRole("button", { name: /Manager Override \+ Check In/i });
    expect(overrideButton).toBeEnabled();
    expect(overrideButton.className).toContain("amber");
    await user.click(overrideButton);
    expect(screen.getAllByText(/Check-in recorded for Sam Noaccess/i).length).toBeGreaterThan(0);
  });

  it("post-sale modal can be closed without losing transaction history", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <PosPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    await user.type(screen.getByLabelText("Search customer"), "Dana");
    await user.keyboard("{ArrowDown}{Enter}");
    await user.click(screen.getByRole("button", { name: "Add Day Pass" }));
    await user.click(screen.getByRole("button", { name: "Complete" }));
    expect(screen.getByRole("dialog", { name: "Post-sale check-in" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog", { name: "Post-sale check-in" })).not.toBeInTheDocument();
    expect(screen.getByText(/Receipt #/i)).toBeInTheDocument();
  });

  it("only quick-button products appear by default", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <PosPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    expect(screen.getByRole("button", { name: "Add Day Pass" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add 10 Visit Pass" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Monthly Membership" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Class Drop-In" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Camp Registration" })).not.toBeInTheDocument();
  });

  it("uses compact cart action labels and does not render legacy overflowing labels", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <PosPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    expect(screen.getByRole("button", { name: "Complete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Complete + Check In" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Complete Sale" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Checkout" })).toBeInTheDocument();
  });

  it("shows persistent payment summary values in cart panel", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <PosPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");
    await user.type(screen.getByLabelText("Search customer"), "Sam");
    await user.keyboard("{ArrowDown}{Enter}");
    await user.click(screen.getByRole("button", { name: "Add Day Pass" }));
    expect(screen.getByText("Subtotal")).toBeInTheDocument();
    expect(screen.getByText("Discounts")).toBeInTheDocument();
    expect(screen.getByText("Taxes")).toBeInTheDocument();
    expect(screen.getByText("Amount Owed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Checkout" })).toBeInTheDocument();
  });

  it("prevents duplicate membership in cart and shows warning", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <PosPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");
    await user.type(screen.getByLabelText("Search customer"), "Maya");
    await user.keyboard("{ArrowDown}{Enter}");
    await user.click(screen.getByRole("button", { name: "Add Monthly Membership" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/Duplicate membership warning/i);
  });

  it("checkout is disabled when no customer is selected", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <PosPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");
    await user.click(screen.getByRole("button", { name: "Add Day Pass" }));

    expect(screen.getByRole("button", { name: "Complete" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Complete + Check In" })).toBeDisabled();
    expect(screen.getByText("Select a customer or continue as guest to complete sale.")).toBeInTheDocument();
  });

  it("checkout is disabled when cart is empty", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <PosPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");
    await user.type(screen.getByLabelText("Search customer"), "Sam");
    await user.keyboard("{ArrowDown}{Enter}");

    expect(screen.getByRole("button", { name: "Complete" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Complete + Check In" })).toBeDisabled();
    expect(screen.getByText("Add at least one product to complete sale.")).toBeInTheDocument();
  });

  it("requires active staff before POS checkout is available", async () => {
    render(
      <TestProviders>
        <TopBar />
        <PosPage />
      </TestProviders>
    );

    expect(screen.getByText("You do not have permission to perform this action.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Switch Staff" })).toBeInTheDocument();
  });

  it("requires POS permission", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <PosPage />
      </TestProviders>
    );

    await activateStaff(user, "4444");
    expect(screen.getByText("You do not have permission to perform this action.")).toBeInTheDocument();
  });

  it("customer search works and day pass sale completes with check-in rule feedback", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <PosPage />
        <CheckInList />
      </TestProviders>
    );

    await activateStaff(user, "2222");
    await user.type(screen.getByLabelText("Search customer"), "Sam");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(screen.getByText("Sam Noaccess")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add Day Pass" }));
    expect(screen.getAllByText("$28.00").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Complete + Check In" }));

    expect(screen.getAllByText(/Sale completed for Sam Noaccess/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Check-in blocked:/i).length).toBeGreaterThan(0);
    expect(screen.getByTestId("header-occupancy")).toHaveTextContent("1 currently in");
    expect(screen.queryByTestId("checkin-row-cust_004")).not.toBeInTheDocument();
  });

  it("staff comp is protected without override permission", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <PosPage />
      </TestProviders>
    );

    await activateStaff(user, "3333");
    await user.type(screen.getByLabelText("Search customer"), "Alex");
    await user.keyboard("{ArrowDown}{Enter}");
    await user.type(screen.getByLabelText("Search products"), "staff");

    const staffCompButton = screen.getByRole("button", { name: "Add Staff Comp" });
    expect(staffCompButton).toBeDisabled();
  });

  it("product search filters all active products and hides inactive products", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <PosPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    expect(screen.queryByRole("button", { name: "Add Retail Placeholder Tee" })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Search products"), "camp");
    expect(screen.getByRole("button", { name: "Add Camp Registration" })).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Search products"));
    await user.type(screen.getByLabelText("Search products"), "membership");
    expect(screen.getAllByRole("button", { name: "Add Monthly Membership" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Add Camp Registration" })).not.toBeInTheDocument();
  });

  it("search results render in shared responsive product-card grid with consistent width", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <PosPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    await user.type(screen.getByLabelText("Search products"), "pass");
    const grid = screen.getByTestId("product-search-results-grid");
    expect(grid.className).toContain("grid");
    expect(grid.className).toContain("sm:grid-cols-2");

    const dayPass = within(grid).getByRole("button", { name: "Add Day Pass" });
    expect(dayPass.className).toContain("w-full");
    expect(dayPass.className).toContain("bg-sky-50");
  });

  it("non-quick products can be found by search and added", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <PosPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    await user.type(screen.getByLabelText("Search products"), "camp");
    const campProduct = screen.getByRole("button", { name: "Add Camp Registration" });
    expect(campProduct).toBeInTheDocument();
    await user.click(campProduct);
    expect(screen.getAllByText("$45.00").length).toBeGreaterThan(0);
  });

  it("product search supports ArrowDown/ArrowUp, Enter add, and Escape clear", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <PosPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    const search = screen.getByLabelText("Search products");
    await user.type(search, "pass");
    const baselineCount = screen.getAllByText("$28.00").length;
    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    expect(options[0].className).toContain("ring-2");

    await user.keyboard("{ArrowDown}");
    const moved = screen.getAllByRole("option");
    expect(moved[1]).toHaveAttribute("aria-selected", "true");
    expect(moved[1].className).toContain("ring-2");

    await user.keyboard("{ArrowUp}");
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{Enter}");
    expect(screen.getAllByText("$28.00").length).toBeGreaterThan(baselineCount);

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox", { name: "Product search results" })).not.toBeInTheDocument();
  });

  it("product search mouse selection still works", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <PosPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    await user.type(screen.getByLabelText("Search products"), "camp");
    await user.click(screen.getByRole("button", { name: "Add Camp Registration" }));
    expect(screen.getAllByText("$45.00").length).toBeGreaterThan(0);
  });

  it("product cards show name, category, and price with category styling and still add to cart", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <PosPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    const dayPass = screen.getByRole("button", { name: "Add Day Pass" });
    expect(dayPass).toHaveTextContent(/Day Pass/i);
    expect(dayPass).toHaveTextContent(/Day Passes • Day Pass/i);
    expect(dayPass).toHaveTextContent("$28.00");
    expect(dayPass.className).toContain("bg-sky-50");

    await user.click(dayPass);
    expect(screen.getAllByText("$28.00").length).toBeGreaterThan(0);
  });

  it("customer search keyboard navigation supports arrows, enter, and escape", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <PosPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    const input = screen.getByLabelText("Search customer");
    await user.type(input, "a");
    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{ArrowDown}");
    const moved = screen.getAllByRole("option");
    expect(moved[1]).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{Enter}");
    expect(screen.queryByRole("listbox", { name: "Customer search results" })).not.toBeInTheDocument();

    await user.type(input, "zzzzzz");
    expect(screen.getByText(/No customers found/i)).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox", { name: "Customer search results" })).not.toBeInTheDocument();
  });

  it("mouse selection still works in customer search", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <PosPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    await user.type(screen.getByLabelText("Search customer"), "Sam");
    await user.click(screen.getByRole("option", { name: /Sam Noaccess/i }));
    expect(screen.queryByRole("listbox", { name: "Customer search results" })).not.toBeInTheDocument();
  });

  it("shows Add Customer when no customer search results match and selects new customer after create", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <PosPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    await user.type(screen.getByLabelText("Search customer"), "no-match-value");
    expect(screen.getByText(/No customers found/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add Customer" }));
    await completeNewCustomerWizardInPos(user, { firstName: "Rae", lastName: "Quick" });

    expect(screen.getByText("Rae Quick")).toBeInTheDocument();
  }, 12000);

  it("preserves cart and auto-selects newly created customer in POS flow", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <PosPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    await user.click(screen.getByRole("button", { name: "Add Day Pass" }));
    expect(screen.getByText(/Subtotal/i)).toBeInTheDocument();
    expect(screen.getAllByText("$28.00").length).toBeGreaterThan(0);

    await user.type(screen.getByLabelText("Search customer"), "new-pos-customer");
    await user.click(screen.getByRole("button", { name: "Add Customer" }));
    await completeNewCustomerWizardInPos(user, { firstName: "Nova", lastName: "Desk" });

    expect(screen.getByText("Nova Desk")).toBeInTheDocument();
    expect(screen.getAllByText("$28.00").length).toBeGreaterThan(0);
  }, 12000);
});

describe("Customer integrations", () => {
  it("sell access launches from customer page and updates customer access", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CustomerList />
      </TestProviders>
    );

    await activateStaff(user, "2222");

    const samCard = screen.getByText("Sam Noaccess").closest("div[class*='p-4']") as HTMLElement;
    await user.click(within(samCard).getByRole("button", { name: "Sell Access" }));
    await user.click(screen.getByRole("button", { name: "Add Day Pass" }));
    await user.click(screen.getByRole("button", { name: "Complete" }));

    expect(screen.getAllByText(/Sale completed for Sam Noaccess/i).length).toBeGreaterThan(0);
  });

  it("blocked check-in state can sell access", async () => {
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

    expect(screen.getByRole("button", { name: "Sell Access" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sell Access" }));
    await user.click(screen.getByRole("button", { name: "Add Day Pass" }));
    await user.click(screen.getByRole("button", { name: "Complete + Check In" }));

    expect(screen.getAllByText(/Sale completed for Sam Noaccess/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Check-in blocked:/i).length).toBeGreaterThan(0);
    expect(screen.queryByTestId("checkin-row-cust_004")).not.toBeInTheDocument();
  });
});
