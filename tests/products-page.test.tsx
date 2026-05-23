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
  await user.type(screen.getByLabelText("Staff PIN input"), pin);
  await user.click(screen.getByRole("button", { name: "Confirm" }));
}

describe("Products page", () => {
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

    await user.click(screen.getByRole("button", { name: "Add Product" }));
    await user.type(screen.getByLabelText("Product name"), "Weekend Pass");
    await user.type(screen.getByLabelText("Product price"), "35");
    await user.type(screen.getByLabelText("Product description"), "Weekend all-day access");
    await user.selectOptions(screen.getByLabelText("Product category"), "day_passes");
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
    await user.click(screen.getByRole("button", { name: "Add Product" }));
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

    await user.click(screen.getByRole("button", { name: "Add Product" }));
    await user.type(screen.getByLabelText("Product name"), "Quick Test Pass");
    await user.type(screen.getByLabelText("Product price"), "20");
    await user.click(screen.getByText("Show as quick button"));
    await user.click(screen.getByRole("button", { name: "Save Product" }));

    expect(screen.getByRole("button", { name: "Add Quick Test Pass" })).toBeInTheDocument();

    const card = screen.getAllByText("Quick Test Pass")[0].closest("article");
    expect(card).not.toBeNull();
    await user.click(within(card as HTMLElement).getByRole("button", { name: "Deactivate" }));

    expect(screen.queryByRole("button", { name: "Add Quick Test Pass" })).not.toBeInTheDocument();
  });

  it("permissions are enforced and validation works", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ProductsPage />
      </TestProviders>
    );

    await activateStaff(user, "3333");

    expect(screen.getByText(/read-only for this staff role/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Product" })).toBeDisabled();

    await user.click(screen.getAllByRole("button", { name: "Switch" })[0]);
    await user.clear(screen.getByLabelText("Staff PIN input"));
    await user.type(screen.getByLabelText("Staff PIN input"), "2222");
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    await user.click(screen.getByRole("button", { name: "Add Product" }));
    await user.click(screen.getByRole("button", { name: "Save Product" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/Product name is required/i);
  });

  it("products search and category filter use aligned layout classes", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ProductsPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    const filterBar = screen.getByTestId("products-filter-bar");
    expect(filterBar.className).toContain("[grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]");

    const search = screen.getByLabelText("Search products");
    const category = screen.getByLabelText("Filter products by category");
    expect(search.className).toContain("h-11");
    expect(category.className).toContain("h-11");
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

    await user.click(screen.getByRole("button", { name: "Add Product" }));
    const dialog = screen.getByRole("dialog");
    const grid = within(dialog).getByTestId("product-form-grid");
    expect(grid.className).toContain("md:grid-cols-2");

    const quick = within(dialog).getByRole("checkbox", { name: /Show as quick button/i }).closest("span");
    const active = within(dialog).getByRole("checkbox", { name: /Active/i }).closest("span");
    const waiver = within(dialog).getByRole("checkbox", { name: /Requires waiver/i }).closest("span");

    expect(quick?.className).toContain("h-11");
    expect(active?.className).toContain("h-11");
    expect(waiver?.className).toContain("h-11");
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

    await user.click(screen.getByRole("button", { name: "Add Product" }));
    await user.type(screen.getByLabelText("Product name"), "Purple Pass");
    await user.type(screen.getByLabelText("Product price"), "22");
    await user.click(screen.getByRole("button", { name: "Product color Purple" }));
    await user.click(screen.getByText("Show as quick button"));
    await user.click(screen.getByRole("button", { name: "Save Product" }));

    const productCard = screen.getAllByText("Purple Pass")[0].closest("article");
    expect(productCard?.className).toContain("bg-violet-50");
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

    await user.click(screen.getByRole("button", { name: "Add Product" }));
    await user.type(screen.getByLabelText("Product name"), "Default Membership Color");
    await user.type(screen.getByLabelText("Product price"), "40");
    await user.selectOptions(screen.getByLabelText("Product category"), "memberships");
    await user.click(screen.getByRole("button", { name: "Save Product" }));

    const defaultCard = screen.getByText("Default Membership Color").closest("article");
    expect(defaultCard?.className).toContain("bg-emerald-50");

    await user.click(screen.getByRole("button", { name: "Add Product" }));
    await user.type(screen.getByLabelText("Product name"), "Overridden Membership Color");
    await user.type(screen.getByLabelText("Product price"), "41");
    await user.selectOptions(screen.getByLabelText("Product category"), "memberships");
    await user.click(screen.getByRole("button", { name: "Product color Red" }));
    await user.click(screen.getByRole("button", { name: "Save Product" }));

    const overrideCard = screen.getByText("Overridden Membership Color").closest("article");
    expect(overrideCard?.className).toContain("bg-rose-50");
  });

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

    await user.click(screen.getByRole("button", { name: "Add Product" }));
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
    expect(card?.className).toContain("bg-orange-50");
    storage.restore();
  });
});
