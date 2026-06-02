import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { vi } from "vitest";
import { CustomerSearchCombobox } from "@/components/shared/customer-search-combobox";
import { customers as seedCustomers } from "@/lib/mocks/customers";
import type { Customer } from "@/types/domain";

function ComboboxHarness({
  customers,
  onSelect = () => undefined
}: {
  customers: Customer[];
  onSelect?: (customerId: string) => void;
}) {
  const [query, setQuery] = useState("");
  return (
    <CustomerSearchCombobox
      label="Search customer"
      placeholder="Search customer"
      query={query}
      onQueryChange={setQuery}
      customers={customers}
      onSelect={onSelect}
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

  it("arrow navigation keeps the active item visible with internal scrolling", async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollIntoView;

    const manyCustomers = Array.from({ length: 75 }).map((_, index) => ({
      ...seedCustomers[0],
      id: `cust_${index}`,
      firstName: `Scroll${index}`,
      lastName: "Customer"
    }));

    render(<ComboboxHarness customers={manyCustomers} />);

    try {
      const input = screen.getByLabelText("Search customer");
      await user.type(input, "Scroll");
      const list = screen.getByRole("listbox", { name: "Customer search results" });
      const options = screen.getAllByRole("option");

      expect(input).toHaveAttribute("aria-controls", list.id);
      expect(options[0]).toHaveAttribute("aria-selected", "true");

      await user.keyboard("{ArrowDown}{ArrowDown}");
      expect(options[2]).toHaveAttribute("aria-selected", "true");
      expect(input).toHaveAttribute("aria-activedescendant", options[2].id);
      expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest", inline: "nearest" });
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });

  it("arrow up scrolls the newly active item back into view", async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollIntoView;

    const manyCustomers = Array.from({ length: 60 }).map((_, index) => ({
      ...seedCustomers[0],
      id: `cust_${index}`,
      firstName: `Back${index}`,
      lastName: "Customer"
    }));

    render(<ComboboxHarness customers={manyCustomers} />);

    try {
      await user.type(screen.getByLabelText("Search customer"), "Back");
      await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}");
      const options = screen.getAllByRole("option");
      expect(options[3]).toHaveAttribute("aria-selected", "true");

      await user.keyboard("{ArrowUp}");
      expect(options[2]).toHaveAttribute("aria-selected", "true");
      expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest", inline: "nearest" });
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });

  it("enter selects the active item", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ComboboxHarness customers={seedCustomers} onSelect={onSelect} />);

    const input = screen.getByLabelText("Search customer");
    await user.type(input, "a");
    const options = screen.getAllByRole("option");
    await user.keyboard("{ArrowDown}{Enter}");

    const activeOptionId = input.getAttribute("aria-activedescendant");
    const activeOption = options.find((option) => option.id === activeOptionId);
    expect(activeOption).toBeTruthy();
    expect(onSelect).toHaveBeenCalledWith(activeOptionId?.replace(/^.*-option-/, ""));
  });
});
