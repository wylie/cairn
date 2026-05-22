import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PosPage from "@/app/(app)/pos/page";
import { CheckInList } from "@/components/checkins/checkin-list";
import { CustomerList } from "@/components/customers/customer-list";
import { TopBar } from "@/components/layout/top-bar";
import { TestProviders } from "@/tests/test-providers";

async function activateStaff(user: ReturnType<typeof userEvent.setup>, pin = "2222") {
  await user.click(screen.getAllByRole("button", { name: "Switch" })[0]);
  await user.type(screen.getByLabelText("Staff PIN input"), pin);
  await user.click(screen.getByRole("button", { name: "Confirm" }));
}

describe("POS page", () => {
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
    expect(screen.getByText("Select a customer to complete sale.")).toBeInTheDocument();
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

  it("customer search works and day pass sale can check in customer", async () => {
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
    expect(screen.getByTestId("header-occupancy")).toHaveTextContent("2 currently in");
    expect(screen.getByTestId("checkin-row-cust_004")).toBeInTheDocument();
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
    expect(dayPass).toHaveTextContent(/Day Passes • Access/i);
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
    await user.type(screen.getByLabelText("First name"), "Rae");
    await user.type(screen.getByLabelText("Last name"), "Quick");
    await user.click(screen.getByRole("button", { name: "Create Customer" }));

    expect(screen.getByText("Rae Quick")).toBeInTheDocument();
  });
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

    expect(screen.getByTestId("checkin-row-cust_004")).toBeInTheDocument();
  });
});
