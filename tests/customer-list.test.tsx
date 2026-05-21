import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomerList } from "@/components/customers/customer-list";
import { CustomerStateProvider } from "@/lib/state/customer-state";

describe("CustomerList", () => {
  it("renders customers", () => {
    render(
      <CustomerStateProvider>
        <CustomerList />
      </CustomerStateProvider>
    );

    expect(screen.getByText("Maya Patel")).toBeInTheDocument();
    expect(screen.getByText("Jordan Kim")).toBeInTheDocument();
  });

  it("filters correctly by name, phone, and member id", async () => {
    const user = userEvent.setup();
    render(
      <CustomerStateProvider>
        <CustomerList />
      </CustomerStateProvider>
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
      <CustomerStateProvider>
        <CustomerList />
      </CustomerStateProvider>
    );

    await user.type(screen.getByLabelText("Search customers"), "no-match-value");
    expect(screen.getByText("No customers found")).toBeInTheDocument();
  });

  it("renders status badges for key customer states", () => {
    render(
      <CustomerStateProvider>
        <CustomerList />
      </CustomerStateProvider>
    );

    expect(screen.getByText("Active Member")).toBeInTheDocument();
    expect(screen.getByText("Expiring Soon")).toBeInTheDocument();
    expect(screen.getByText("Day Pass")).toBeInTheDocument();
    expect(screen.getAllByText("Waiver Missing").length).toBeGreaterThan(0);
    expect(screen.getByText("Checked In")).toBeInTheDocument();
  });
});
