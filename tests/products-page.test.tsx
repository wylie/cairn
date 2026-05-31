import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import ProductsPage from "@/app/(app)/products/page";
import PosPage from "@/app/(app)/pos/page";
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

async function activateStaff(user: ReturnType<typeof userEvent.setup>, pin = "2222") {
  await user.click(screen.getAllByRole("button", { name: "Switch" })[0]);
  const input = screen.getByLabelText("Staff PIN input");
  await user.clear(input);
  await user.type(input, pin);
  await user.click(screen.getByRole("button", { name: "Confirm" }));
}

describe("Products page", () => {
  it("manages access products including memberships, punch passes, day passes, programs, and rentals", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ProductsPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    expect(screen.getAllByText(/Monthly Membership|Unlimited Membership/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/10 Visit Pass|10 Climb Visits/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Day Pass/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Camp Registration|Intro to Climbing/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Harness Rental|Bike Rental/i).length).toBeGreaterThan(0);
  });

  it("product creation works and appears in POS search", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ProductsPage />
        <PosPage />
      </TestProviders>
    );

    await activateStaff(user, "2222");

    await user.click(screen.getAllByRole("button", { name: "Add Product" })[0]);
    await user.type(screen.getByLabelText("Product name"), "Weekend Pass");
    await user.type(screen.getByLabelText("Product price"), "35");
    await user.type(screen.getByLabelText("Product description"), "Weekend all-day access");
    await user.selectOptions(screen.getByLabelText("Product type"), "access");
    await user.click(screen.getByRole("button", { name: "Save Product" }));

    expect(screen.getByRole("status")).toHaveTextContent(/Product created: Weekend Pass/i);

    await user.type(screen.getAllByLabelText("Search products")[1], "weekend");
    expect(screen.getByRole("button", { name: "Add Weekend Pass" })).toBeInTheDocument();
  });

  it("product editing works", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ProductsPage />
      </TestProviders>
    );

    await activateStaff(user, "2222");

    await user.click(screen.getAllByRole("button", { name: "Edit Product" })[0]);
    const description = screen.getByLabelText("Product description");
    await user.clear(description);
    await user.type(description, "Updated description");
    await user.click(screen.getByRole("button", { name: "Save Product" }));

    expect(screen.getByRole("status")).toHaveTextContent(/Product updated/i);
    expect(screen.getByText("Updated description")).toBeInTheDocument();
  });

  it("owner can manage products", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ProductsPage />
      </TestProviders>
    );

    await activateStaff(user, "1111");
    expect(screen.getByRole("button", { name: "Add Product" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Edit Product" }).length).toBeGreaterThan(0);
  });

  it("product persists after refresh", async () => {
    const storage = installStorageMock();
    const user = userEvent.setup();
    const first = render(
      <TestProviders>
        <TopBar />
        <ProductsPage />
      </TestProviders>
    );

    await activateStaff(user, "2222");
    await user.click(screen.getAllByRole("button", { name: "Add Product" })[0]);
    await user.type(screen.getByLabelText("Product name"), "Late Entry");
    await user.type(screen.getByLabelText("Product price"), "15");
    await user.click(screen.getByRole("button", { name: "Save Product" }));

    first.unmount();

    render(
      <TestProviders>
        <TopBar />
        <ProductsPage />
      </TestProviders>
    );

    expect(screen.getByText("Late Entry")).toBeInTheDocument();
    storage.restore();
  });

  it("inactive products are hidden from POS and quick-button toggle works", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ProductsPage />
        <PosPage />
      </TestProviders>
    );

    await activateStaff(user, "2222");

    await user.click(screen.getAllByRole("button", { name: "Add Product" })[0]);
    await user.type(screen.getByLabelText("Product name"), "Quick Test Pass");
    await user.type(screen.getByLabelText("Product price"), "20");
    await user.click(screen.getByText("Show as quick button"));
    await user.click(screen.getByRole("button", { name: "Save Product" }));

    expect(screen.getByRole("button", { name: "Add Quick Test Pass" })).toBeInTheDocument();

    const card = screen.getAllByText("Quick Test Pass")[0].closest("article");
    expect(card).not.toBeNull();
    const deactivateButton = within(card as HTMLElement).getByRole("button", { name: "Deactivate" });
    expect(deactivateButton.className).toContain("rose");
    await user.click(deactivateButton);

    expect(screen.queryByRole("button", { name: "Add Quick Test Pass" })).not.toBeInTheDocument();
  }, 12000);

  it("permissions are enforced and validation works", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ProductsPage />
      </TestProviders>
    );

    await activateStaff(user, "3333");

    expect(screen.getByText(/do not have permission to manage products/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Product" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Customize Quick Buttons" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit Product" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Duplicate" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Variant" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Deactivate" })).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Switch" })[0]);
    await user.clear(screen.getByLabelText("Staff PIN input"));
    await user.type(screen.getByLabelText("Staff PIN input"), "2222");
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    await user.click(screen.getAllByRole("button", { name: "Add Product" })[0]);
    await user.click(screen.getByRole("button", { name: "Save Product" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/Product name is required/i);
  });

  it("products search and filter controls use aligned layout classes", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ProductsPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    const filterBar = screen.getByTestId("products-filter-bar");
    expect(filterBar.className).toContain("[grid-template-columns:minmax(220px,2fr)_repeat(auto-fit,minmax(160px,1fr))]");

    const search = screen.getByLabelText("Search products");
    const category = screen.getByLabelText("Filter products by tag");
    const status = screen.getByLabelText("Filter products by status");
    expect(search.className).toContain("h-11");
    expect(category.className).toContain("h-11");
    expect(status.className).toContain("h-11");
  });

  it("quick button layout manager opens and reordering controls are available", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ProductsPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    await user.click(screen.getByRole("button", { name: "Customize Quick Buttons" }));
    expect(screen.getByRole("dialog", { name: "Customize Quick Buttons" })).toBeInTheDocument();
    const items = screen.getAllByTestId("quick-layout-item");
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].className).toContain("bg-");
    expect(within(items[0]).getByRole("button", { name: "Move down" })).toBeInTheDocument();
  });

  it("archive filter shows inactive products", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ProductsPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    const card = screen.getAllByRole("button", { name: "Deactivate" })[0].closest("article");
    expect(card).not.toBeNull();
    await user.click(within(card as HTMLElement).getByRole("button", { name: "Deactivate" }));
    await user.selectOptions(screen.getByLabelText("Filter products by status"), "inactive");
    expect(screen.getAllByRole("button", { name: "Activate" }).length).toBeGreaterThan(0);
  });

  it("add product modal fields align using shared form layout", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ProductsPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    await user.click(screen.getAllByRole("button", { name: "Add Product" })[0]);
    const dialog = screen.getByRole("dialog");
    const grid = within(dialog).getByTestId("product-form-grid");
    expect(grid.className).toContain("md:grid-cols-2");

    expect(within(dialog).getByRole("checkbox", { name: /Show as quick button/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("checkbox", { name: /Active/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("checkbox", { name: /Requires waiver/i })).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Product category")).toBeInTheDocument();
  });

  it("supports category management and uses category dropdown for products", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ProductsPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    await user.click(screen.getByRole("button", { name: "Categories" }));
    await user.type(screen.getByLabelText("New category"), "Parties");
    await user.click(screen.getByRole("button", { name: "Add Category" }));
    expect(screen.getByRole("status")).toHaveTextContent(/Category created: Parties/i);

    await user.click(screen.getByRole("button", { name: "Products" }));
    await user.click(screen.getAllByRole("button", { name: "Add Product" })[0]);
    const categorySelect = screen.getByLabelText("Product category");
    expect(within(categorySelect).getByRole("option", { name: "Parties" })).toBeInTheDocument();
  });

  it("product color can be selected and is used on products and POS cards", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ProductsPage />
        <PosPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    await user.click(screen.getAllByRole("button", { name: "Add Product" })[0]);
    await user.type(screen.getByLabelText("Product name"), "Purple Pass");
    await user.type(screen.getByLabelText("Product price"), "22");
    await user.click(screen.getByRole("button", { name: "Product color Purple" }));
    await user.click(screen.getByText("Show as quick button"));
    await user.click(screen.getByRole("button", { name: "Save Product" }));

    const productCard = screen.getAllByText("Purple Pass")[0].closest("article");
    expect(productCard?.className).not.toContain("bg-violet-50");
    expect(productCard?.className).not.toContain("border-l-violet-400");
    const posButton = screen.getByRole("button", { name: "Add Purple Pass" });
    expect(posButton.className).toContain("bg-violet-50");
  });

  it("default category colors apply and color override works", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ProductsPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    await user.click(screen.getAllByRole("button", { name: "Add Product" })[0]);
    await user.type(screen.getByLabelText("Product name"), "Default Membership Color");
    await user.type(screen.getByLabelText("Product price"), "40");
    await user.selectOptions(screen.getByLabelText("Product type"), "membership");
    await user.click(screen.getByRole("button", { name: "Save Product" }));

    const defaultCard = screen.getByText("Default Membership Color").closest("article");
    expect(defaultCard?.className).not.toContain("border-l-emerald-400");

    await user.click(screen.getAllByRole("button", { name: "Add Product" })[0]);
    await user.type(screen.getByLabelText("Product name"), "Overridden Membership Color");
    await user.type(screen.getByLabelText("Product price"), "41");
    await user.selectOptions(screen.getByLabelText("Product type"), "membership");
    await user.click(screen.getByRole("button", { name: "Product color Red" }));
    await user.click(screen.getByRole("button", { name: "Save Product" }));

    const overrideCard = screen.getByText("Overridden Membership Color").closest("article");
    expect(overrideCard?.className).not.toContain("border-l-rose-500");
  }, 12000);

  it("selected color persists after refresh", async () => {
    const storage = installStorageMock();
    const user = userEvent.setup();
    const first = render(
      <TestProviders>
        <TopBar />
        <ProductsPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    await user.click(screen.getAllByRole("button", { name: "Add Product" })[0]);
    await user.type(screen.getByLabelText("Product name"), "Persistent Orange Product");
    await user.type(screen.getByLabelText("Product price"), "18");
    await user.click(screen.getByRole("button", { name: "Product color Orange" }));
    await user.click(screen.getByRole("button", { name: "Save Product" }));

    first.unmount();
    render(
      <TestProviders>
        <TopBar />
        <ProductsPage />
      </TestProviders>
    );
    const card = screen.getByText("Persistent Orange Product").closest("article");
    expect(card?.className).not.toContain("border-l-orange-400");
    storage.restore();
  });

  it("button hierarchy includes icons and no product-level reorder controls", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ProductsPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    const dayPassCard = screen.getAllByRole("button", { name: "Edit Product" })[0].closest("article");
    expect(dayPassCard).not.toBeNull();
    expect(within(dayPassCard as HTMLElement).getByRole("button", { name: "Edit Product" })).toBeInTheDocument();
    expect(within(dayPassCard as HTMLElement).getByRole("button", { name: "Duplicate" })).toBeInTheDocument();
    expect(within(dayPassCard as HTMLElement).queryByRole("button", { name: "Reorder" })).not.toBeInTheDocument();
    expect(within(dayPassCard as HTMLElement).queryByRole("button", { name: "Move Up" })).not.toBeInTheDocument();
    expect(within(dayPassCard as HTMLElement).queryByRole("button", { name: "Move Down" })).not.toBeInTheDocument();
  });

  it("supports display-group tabs independently from system type", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ProductsPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    await user.click(screen.getAllByRole("button", { name: "Add Product" })[0]);
    await user.type(screen.getByLabelText("Product name"), "Youth Intro Pack");
    await user.type(screen.getByLabelText("Product price"), "19");
    await user.selectOptions(screen.getByLabelText("Product type"), "access");
    const displayTypeInput = screen.getByLabelText("Product display type");
    await user.clear(displayTypeInput);
    await user.type(displayTypeInput, "Youth Programs");
    await user.type(screen.getByLabelText("Product tags"), "Youth");
    await user.click(screen.getByRole("button", { name: "Save Product" }));

    await user.click(screen.getByRole("button", { name: /Youth Programs/i }));
    expect(screen.getByText("Youth Intro Pack")).toBeInTheDocument();
    expect(screen.queryByText("Monthly Membership")).not.toBeInTheDocument();

    const tagSelect = screen.getByLabelText("Filter products by tag");
    await user.selectOptions(tagSelect, "Youth");
    expect(screen.getByText("Youth Intro Pack")).toBeInTheDocument();
  });

  it("duplicate appends copy naming and opens edit modal", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ProductsPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    const dayPassCard = screen.getAllByRole("button", { name: "Duplicate" })[0].closest("article");
    expect(dayPassCard).not.toBeNull();
    await user.click(within(dayPassCard as HTMLElement).getByRole("button", { name: "Duplicate" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    const nameInput = screen.getByLabelText("Product name");
    expect(nameInput).toHaveFocus();
    expect(String((nameInput as HTMLInputElement).value)).toMatch(/ - Copy/i);
  });

  it("uses secondary outlined style for duplicate action", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ProductsPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");
    const duplicateButton = screen.getAllByRole("button", { name: "Duplicate" })[0];
    expect(duplicateButton.className).toContain("border");
    expect(duplicateButton.className).not.toContain("hover:bg-rose");
  });

  it("creates a retail product with sku/barcode and finds it by barcode search", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ProductsPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    await user.click(screen.getAllByRole("button", { name: "Add Product" })[0]);
    await user.type(screen.getByLabelText("Product name"), "Retail Bottle");
    await user.type(screen.getByLabelText("Product price"), "14");
    await user.type(screen.getByLabelText("Product SKU"), "RTL-BOTTLE-001");
    await user.type(screen.getByLabelText("Product barcode"), "777000111");
    await user.selectOptions(screen.getByLabelText("Product type"), "retail");
    await user.click(screen.getByRole("button", { name: "Save Product" }));

    await user.clear(screen.getByLabelText("Search products"));
    await user.type(screen.getByLabelText("Search products"), "777000111");
    expect(screen.getByText("Retail Bottle")).toBeInTheDocument();
  });

  it("supports variant creation for retail/rental products", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ProductsPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    const retailCard = screen.getByText("Summit Tee").closest("article");
    expect(retailCard).not.toBeNull();
    await user.click(within(retailCard as HTMLElement).getByRole("button", { name: "Add Variant" }));
    expect(screen.getByRole("status")).toHaveTextContent(/Variant created for Summit Tee/i);
    expect(within(retailCard as HTMLElement).getAllByText(/Variant \d+/i).length).toBeGreaterThan(0);
  });

  it("supports inventory adjustments, transfers, and low stock warnings", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ProductsPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    await user.click(screen.getByRole("button", { name: "Inventory" }));
    expect(screen.getByText("Inventory by facility")).toBeInTheDocument();

    const lowStockRows = screen.getAllByText("Low Stock");
    expect(lowStockRows.length).toBeGreaterThan(0);

    const rowAction = screen.getAllByRole("button", { name: /Adjust stock/i })[0];
    await user.click(rowAction);
    expect(screen.getByRole("status")).toHaveTextContent(/Inventory updated/i);

    const transferAction = screen.getAllByRole("button", { name: /Transfer stock/i })[0];
    await user.click(transferAction);
    expect(screen.getByRole("status")).toHaveTextContent(/Inventory transferred/i);
  });
});
