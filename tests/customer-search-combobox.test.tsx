import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { CustomerSearchCombobox } from "@/components/shared/customer-search-combobox";
import { customers as seedCustomers } from "@/lib/mocks/customers";
import type { Customer } from "@/types/domain";

function ComboboxHarness({ customers }: { customers: Customer[] }) {
  const [query, setQuery] = useState("");
  return (
    <CustomerSearchCombobox
      label="Search customer"
      placeholder="Search customer"
      query={query}
      onQueryChange={setQuery}
      customers={customers}
      onSelect={() => undefined}
    />
  );
}

describe("CustomerSearchCombobox", () => {
  it("constrains results list height and enables internal scrolling", async () => {
    const user = userEvent.setup();
    const manyCustomers = Array.from({ length: 75 }).map((_, index) => ({
      ...seedCustomers[0],
      id: `cust_${index}`,
      firstName: `Test${index}`,
      lastName: "Customer"
    }));
    render(<ComboboxHarness customers={manyCustomers} />);

    await user.type(screen.getByLabelText("Search customer"), "Test");
    const list = screen.getByRole("listbox", { name: "Customer search results" });
    expect(list.className).toContain("max-h-[50vh]");
    expect(list.className).toContain("md:max-h-[420px]");
    expect(list.className).toContain("overflow-y-auto");
  });

  it("shows capped result count helper text", async () => {
    const user = userEvent.setup();
    const manyCustomers = Array.from({ length: 80 }).map((_, index) => ({
      ...seedCustomers[0],
      id: `cust_${index}`,
      firstName: `Match${index}`,
      lastName: "User"
    }));
    render(<ComboboxHarness customers={manyCustomers} />);

    await user.type(screen.getByLabelText("Search customer"), "Match");
    expect(screen.getByText(/Showing 50 of 80 matching customers/i)).toBeInTheDocument();
    expect(screen.getByText(/Refine your search to narrow results/i)).toBeInTheDocument();
  });

  it("escape closes result list", async () => {
    const user = userEvent.setup();
    render(<ComboboxHarness customers={seedCustomers} />);
    const input = screen.getByLabelText("Search customer");
    await user.type(input, "Maya");
    expect(screen.getByRole("listbox", { name: "Customer search results" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox", { name: "Customer search results" })).not.toBeInTheDocument();
  });
});
