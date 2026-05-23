import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { CheckInList } from "@/components/checkins/checkin-list";
import { CustomerList } from "@/components/customers/customer-list";
import { TopBar } from "@/components/layout/top-bar";
import { TestProviders } from "@/tests/test-providers";

function installStorageMock() {
  const store = new Map<string, string>();
  const original = window.localStorage;

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        store.delete(key);
      })
    }
  });

  return {
    restore() {
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        value: original
      });
    }
  };
}

async function activateStaff(user: ReturnType<typeof userEvent.setup>, pin = "1111") {
  await user.click(screen.getAllByRole("button", { name: "Switch" })[0]);
  await user.type(screen.getByLabelText("Staff PIN input"), pin);
  await user.click(screen.getByRole("button", { name: "Confirm" }));
}

async function completeNewCustomerWizard(
  user: ReturnType<typeof userEvent.setup>,
  input: {
    firstName: string;
    lastName: string;
    dob?: string;
    phone?: string;
    addressLine1?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    emergencyName?: string;
    emergencyPhone?: string;
    waiverChoice?: "signed_today" | "on_file" | "needs_waiver";
  }
) {
  await user.type(screen.getByLabelText("First name"), input.firstName);
  await user.type(screen.getByLabelText("Last name"), input.lastName);
  await user.type(screen.getByLabelText("Date of birth"), input.dob ?? "1992-03-14");
  await user.click(screen.getByRole("button", { name: "Next" }));

  await user.type(screen.getByLabelText("Phone"), input.phone ?? "(212) 555-7788");
  await user.click(screen.getByRole("button", { name: "Next" }));

  await user.type(screen.getByLabelText("Address line 1"), input.addressLine1 ?? "10 Main St");
  await user.type(screen.getByLabelText("City"), input.city ?? "New York");
  await user.type(screen.getByLabelText("State"), input.state ?? "NY");
  await user.type(screen.getByLabelText("ZIP/postal code"), input.postalCode ?? "10001");
  await user.click(screen.getByRole("button", { name: "Next" }));

  await user.type(screen.getByLabelText("Emergency contact name"), input.emergencyName ?? "Pat Stone");
  await user.type(screen.getByLabelText("Emergency contact phone"), input.emergencyPhone ?? "(212) 555-8899");
  await user.click(screen.getByRole("button", { name: "Next" }));

  if (input.waiverChoice === "signed_today") {
    await user.click(screen.getByLabelText("Waiver signed today"));
  } else if (input.waiverChoice === "on_file") {
    await user.click(screen.getByLabelText("Waiver already on file"));
  } else {
    await user.click(screen.getByLabelText("Needs waiver"));
  }
  await user.click(screen.getByRole("button", { name: "Next" }));
  await user.click(screen.getByRole("button", { name: "Create Customer" }));
}

describe("CustomerList", () => {
  it("renders customers", () => {
    render(
      <TestProviders>
        <CustomerList />
      </TestProviders>
    );

    expect(screen.getByText("Maya Patel")).toBeInTheDocument();
    expect(screen.getByText("Jordy Kim")).toBeInTheDocument();
    expect(screen.getByText("Legal: Jordan Kim")).toBeInTheDocument();
  });

  it("preferred name displays with legal name when different", () => {
    render(
      <TestProviders>
        <CustomerList />
      </TestProviders>
    );

    expect(screen.getByText("Jordy Kim")).toBeInTheDocument();
    expect(screen.getByText("Legal: Jordan Kim")).toBeInTheDocument();
  });

  it("quick info section renders pronouns, DOB with age, and phone", () => {
    render(
      <TestProviders>
        <CustomerList />
      </TestProviders>
    );

    const mayaCard = screen.getByText("Maya Patel").closest("div[class*='p-4']") as HTMLElement;
    const quickInfo = within(mayaCard).getByLabelText("Quick Info");
    expect(quickInfo).toBeInTheDocument();
    expect(within(mayaCard).getByText("She/her")).toBeInTheDocument();
    expect(within(quickInfo).getByText(/\d{1,2}\/\d{1,2}\/\d{4}\s+\(\d+\)/)).toBeInTheDocument();
    expect(within(mayaCard).getByText("(212) 555-0112")).toBeInTheDocument();
    expect(within(quickInfo).getByText(/Priya Patel\s*\(212\) 555-9001/)).toBeInTheDocument();
  });

  it("customer cards remain compact and do not show full profile details", () => {
    render(
      <TestProviders>
        <CustomerList />
      </TestProviders>
    );

    const mayaCard = screen.getByText("Maya Patel").closest("div[class*='p-4']") as HTMLElement;
    expect(within(mayaCard).getByText(/M-1001/i)).toBeInTheDocument();
    expect(within(mayaCard).queryByText(/Spring St|New York|maya.patel@example.com/i)).not.toBeInTheDocument();
  });

  it("pronouns render in quick info tiles", () => {
    render(
      <TestProviders>
        <CustomerList />
      </TestProviders>
    );

    const alexCard = screen.getByText("Alex Rivera").closest("div[class*='p-4']") as HTMLElement;
    expect(within(alexCard).getByText("He/him")).toBeInTheDocument();
  });

  it("quick info layout uses a responsive two-column grid", () => {
    render(
      <TestProviders>
        <CustomerList />
      </TestProviders>
    );

    const mayaCard = screen.getByText("Maya Patel").closest("div[class*='p-4']") as HTMLElement;
    const quickInfo = within(mayaCard).getByLabelText("Quick Info");
    expect(quickInfo.className).toContain("grid");
    expect(quickInfo.className).toContain("grid-cols-2");
  });

  it("filters correctly by name, phone, and member id", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <CustomerList />
      </TestProviders>
    );

    const search = screen.getByLabelText("Search customers");
    await user.type(search, "maya");
    expect(screen.getByText("Maya Patel")).toBeInTheDocument();
    expect(screen.queryByText("Jordy Kim")).not.toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "0144");
    expect(screen.getByText("Alex Rivera")).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "M-1002");
    expect(screen.getByText("Jordy Kim")).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "jordy");
    expect(screen.getByText("Jordy Kim")).toBeInTheDocument();
  });

  it("shows empty state when no customer matches", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <CustomerList />
      </TestProviders>
    );

    await user.type(screen.getByLabelText("Search customers"), "no-match-value");
    expect(screen.getByText("No customers found")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Add Customer" }).length).toBeGreaterThan(0);
  });

  it("shows Add Customer action on customers page", () => {
    render(
      <TestProviders>
        <CustomerList />
      </TestProviders>
    );

    expect(screen.getByRole("button", { name: "Add Customer" })).toBeInTheDocument();
  });

  it("validates required fields when adding a customer", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <CustomerList />
      </TestProviders>
    );

    await user.click(screen.getAllByRole("button", { name: "Add Customer" })[0]);
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("alert")).toHaveTextContent("First and last name are required.");
  });

  it("creates a new customer and it appears in search", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <CustomerList />
      </TestProviders>
    );

    await user.click(screen.getAllByRole("button", { name: "Add Customer" })[0]);
    await completeNewCustomerWizard(user, { firstName: "Nina", lastName: "Stone", waiverChoice: "signed_today" });
    expect(screen.getByText(/Customer created: Nina Stone/i)).toBeInTheDocument();

    const search = screen.getByLabelText("Search customers");
    await user.clear(search);
    await user.type(search, "Nina");
    expect(screen.getByText("Nina Stone")).toBeInTheDocument();
  });

  it("new customer persists after refresh", async () => {
    const storage = installStorageMock();
    const user = userEvent.setup();
    const first = render(
      <TestProviders>
        <CustomerList />
      </TestProviders>
    );

    await user.click(screen.getAllByRole("button", { name: "Add Customer" })[0]);
    await completeNewCustomerWizard(user, { firstName: "Parker", lastName: "Lane" });
    await user.click(screen.getByRole("button", { name: "Done" }));

    first.unmount();

    render(
      <TestProviders>
        <CustomerList />
      </TestProviders>
    );

    await user.type(screen.getByLabelText("Search customers"), "Parker");
    expect(screen.getByText("Parker Lane")).toBeInTheDocument();
    storage.restore();
  });

  it("shows age preview and minor banner while creating customer", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <CustomerList />
      </TestProviders>
    );

    await user.click(screen.getAllByRole("button", { name: "Add Customer" })[0]);
    await user.type(screen.getByLabelText("First name"), "Minor");
    await user.type(screen.getByLabelText("Last name"), "Tester");
    await user.type(screen.getByLabelText("Date of birth"), "2016-05-23");
    expect(screen.getByLabelText("Age preview")).toHaveTextContent(/Age: \d+ years old/i);
    expect(screen.getByText("Minor account, guardian relationship recommended.")).toBeInTheDocument();
  });

  it("links related customer during onboarding and shows success quick actions", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <CustomerList />
      </TestProviders>
    );

    await user.click(screen.getAllByRole("button", { name: "Add Customer" })[0]);
    await user.type(screen.getByLabelText("First name"), "Family");
    await user.type(screen.getByLabelText("Last name"), "Child");
    await user.type(screen.getByLabelText("Date of birth"), "2015-06-15");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.type(screen.getByLabelText("Phone"), "(212) 555-3300");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.type(screen.getByLabelText("Address line 1"), "77 Family Ln");
    await user.type(screen.getByLabelText("City"), "New York");
    await user.type(screen.getByLabelText("State"), "NY");
    await user.type(screen.getByLabelText("ZIP/postal code"), "10011");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.type(screen.getByLabelText("Emergency contact name"), "Maya Patel");
    await user.type(screen.getByLabelText("Emergency contact phone"), "(212) 555-0101");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByLabelText("Waiver signed today"));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.type(screen.getByLabelText("Link to existing customer"), "Maya Patel");
    await user.click(screen.getByRole("button", { name: /Maya Patel/i }));
    await user.selectOptions(screen.getByLabelText("Relationship type"), "parent_guardian");
    await user.click(screen.getByRole("button", { name: "Create Customer" }));

    const successDialog = screen.getByRole("dialog", { name: "New Customer" });
    expect(screen.getByText(/Customer created: Family Child/i)).toBeInTheDocument();
    expect(within(successDialog).getByRole("button", { name: "Sell Access" })).toBeInTheDocument();
    expect(within(successDialog).getByRole("button", { name: "Check In" })).toBeInTheDocument();
    expect(within(successDialog).getByRole("button", { name: "Mark Waiver Signed" })).toBeInTheDocument();
    expect(within(successDialog).getByRole("button", { name: "View Profile" })).toBeInTheDocument();
    expect(within(successDialog).getByRole("button", { name: "Add Family Member" })).toBeInTheDocument();
  });

  it("renders status badges for key customer states", () => {
    render(
      <TestProviders>
        <CustomerList />
      </TestProviders>
    );

    expect(screen.getByText("Membership Active")).toBeInTheDocument();
    expect(screen.getByText("Membership Expiring Soon")).toBeInTheDocument();
    expect(screen.getByText("Day Pass")).toBeInTheDocument();
    expect(screen.getAllByText("Waiver Missing").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Waiver Valid").length).toBeGreaterThan(0);
    expect(screen.getAllByText("No Active Access").length).toBeGreaterThan(0);
    expect(screen.getByText("Checked In")).toBeInTheDocument();
  });

  it("customers page check in works with active staff and updates occupancy + badges", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CustomerList />
      </TestProviders>
    );

    await activateStaff(user, "2222");

    const danaCard = screen.getByText("Dana Daypass").closest("div[class*='p-4']") as HTMLElement;
    await user.click(within(danaCard).getByRole("button", { name: "Check In" }));

    expect(screen.getByRole("status")).toHaveTextContent(/Check-in recorded for Dana Daypass/i);
    expect(screen.getByTestId("header-occupancy")).toHaveTextContent("2 currently in");
    expect(within(danaCard).getByText("Checked In")).toBeInTheDocument();
  });

  it("customers page check in records staff attribution in shared check-in log", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CustomerList />
        <CheckInList />
      </TestProviders>
    );

    await activateStaff(user, "2222");

    const danaCard = screen.getByText("Dana Daypass").closest("div[class*='p-4']") as HTMLElement;
    await user.click(within(danaCard).getByRole("button", { name: "Check In" }));

    const row = screen.getByTestId("checkin-row-cust_005");
    expect(within(row).getByText(/Checked in by: Maya Lopez/i)).toBeInTheDocument();
  });

  it("customers page check out works with active staff and changes badge", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CustomerList />
      </TestProviders>
    );

    await activateStaff(user, "1111");

    const mayaCard = screen.getByText("Maya Patel").closest("div[class*='p-4']") as HTMLElement;
    await user.click(within(mayaCard).getByRole("button", { name: "Check Out" }));

    expect(screen.getByRole("status")).toHaveTextContent(/Check-in updated for Maya Patel/i);
    expect(within(mayaCard).getByText("Checked Out")).toBeInTheDocument();
  });

  it("blocked customer cannot be checked in", () => {
    render(
      <TestProviders>
        <CustomerList />
      </TestProviders>
    );

    const samCard = screen.getByText("Sam Noaccess").closest("div[class*='p-4']") as HTMLElement;
    const checkIn = within(samCard).getByText("Check In").closest("button") as HTMLButtonElement;
    expect(checkIn).toBeDisabled();
    expect(within(samCard).getByText("Waiver Missing")).toBeInTheDocument();
    expect(within(samCard).getByText("No Active Access")).toBeInTheDocument();
    expect(within(samCard).queryByText(/Blocked:/i)).not.toBeInTheDocument();
    expect(within(samCard).queryByText(/Access Denied:/i)).not.toBeInTheDocument();
  });

  it("no active staff prompts PIN/staff switch", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <CustomerList />
      </TestProviders>
    );

    const danaCard = screen.getByText("Dana Daypass").closest("div[class*='p-4']") as HTMLElement;
    await user.click(within(danaCard).getByRole("button", { name: "Check In" }));

    expect(screen.getByRole("dialog", { name: "Staff PIN" })).toBeInTheDocument();
  });

  it("staff without permission cannot check in", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CustomerList />
      </TestProviders>
    );

    await activateStaff(user, "4444");

    const danaCard = screen.getByText("Dana Daypass").closest("div[class*='p-4']") as HTMLElement;
    await user.click(within(danaCard).getByRole("button", { name: "Check In" }));

    expect(screen.getByRole("alert")).toHaveTextContent("You do not have permission to perform this action.");
  });

  it("customers page check in persists after refresh", async () => {
    const storage = installStorageMock();
    const user = userEvent.setup();

    const first = render(
      <TestProviders>
        <TopBar />
        <CustomerList />
      </TestProviders>
    );

    await activateStaff(user, "2222");

    const danaCard = screen.getByText("Dana Daypass").closest("div[class*='p-4']") as HTMLElement;
    await user.click(within(danaCard).getByRole("button", { name: "Check In" }));

    first.unmount();

    render(
      <TestProviders>
        <TopBar />
        <CustomerList />
      </TestProviders>
    );

    const reloadedDana = screen.getByText("Dana Daypass").closest("div[class*='p-4']") as HTMLElement;
    expect(within(reloadedDana).getByText("Checked In")).toBeInTheDocument();
    expect(screen.getByTestId("header-occupancy")).toHaveTextContent("2 currently in");

    storage.restore();
  });
});
