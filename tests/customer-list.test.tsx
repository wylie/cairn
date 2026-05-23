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

describe("CustomerList", () => {
  it("renders customers", () => {
    render(
      <TestProviders>
        <CustomerList />
      </TestProviders>
    );

    expect(screen.getByText("Maya Patel")).toBeInTheDocument();
    expect(screen.getByText("Jordan Kim")).toBeInTheDocument();
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
    expect(screen.queryByText("Jordan Kim")).not.toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "0144");
    expect(screen.getByText("Alex Rivera")).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "M-1002");
    expect(screen.getByText("Jordan Kim")).toBeInTheDocument();
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
    await user.click(screen.getByRole("button", { name: "Create Customer" }));
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
    await user.type(screen.getByLabelText("First name"), "Nina");
    await user.type(screen.getByLabelText("Last name"), "Stone");
    await user.click(screen.getByRole("button", { name: "Create Customer" }));

    expect(screen.getByRole("status")).toHaveTextContent(/Customer created: Nina Stone/i);

    await user.type(screen.getByLabelText("Search customers"), "Nina");
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
    await user.type(screen.getByLabelText("First name"), "Parker");
    await user.type(screen.getByLabelText("Last name"), "Lane");
    await user.click(screen.getByRole("button", { name: "Create Customer" }));

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

  it("renders status badges for key customer states", () => {
    render(
      <TestProviders>
        <CustomerList />
      </TestProviders>
    );

    expect(screen.getByText("Active Member")).toBeInTheDocument();
    expect(screen.getByText("Expiring Soon")).toBeInTheDocument();
    expect(screen.getByText("Day Pass")).toBeInTheDocument();
    expect(screen.getAllByText("Waiver Missing").length).toBeGreaterThan(0);
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
    expect(within(samCard).getByText(/Access Denied:/i)).toBeInTheDocument();
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
