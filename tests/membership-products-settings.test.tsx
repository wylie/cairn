import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsPage from "@/app/(app)/settings/page";
import { TestProviders } from "@/tests/test-providers";
import { TopBar } from "@/components/layout/top-bar";
import { vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/settings"
}));

async function switchStaff(user: ReturnType<typeof userEvent.setup>, pin: string) {
  await user.click(screen.getByRole("button", { name: "Switch" }));
  await user.type(screen.getByLabelText("Staff PIN input"), pin);
  await user.click(screen.getByRole("button", { name: "Confirm" }));
}

describe("membership products settings", () => {
  it("renders membership product tabs and product cards", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <SettingsPage />
      </TestProviders>
    );

    await switchStaff(user, "1111");
    await user.click(screen.getByRole("button", { name: "Membership Products" }));

    expect(screen.getByRole("button", { name: "Memberships" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Punch Passes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Day Passes" })).toBeInTheDocument();
    expect(screen.getAllByTestId("membership-product-card").length).toBeGreaterThan(0);
  });

  it("supports create, duplicate, and archive from membership products", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <SettingsPage />
      </TestProviders>
    );

    await switchStaff(user, "1111");
    await user.click(screen.getByRole("button", { name: "Membership Products" }));
    await user.click(screen.getByRole("button", { name: "Create product" }));

    const dialog = screen.getByRole("dialog", { name: "Create Product" });
    await user.type(within(dialog).getByLabelText("Name"), "Weekend Membership");
    await user.type(within(dialog).getByLabelText("Price"), "79");
    await user.selectOptions(within(dialog).getByLabelText("Type"), "membership");
    await user.click(within(dialog).getByRole("button", { name: "Save Product" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Product created");

    const createdCard = screen.getByText("Weekend Membership").closest("[data-testid='membership-product-card']") as HTMLElement;
    await user.click(within(createdCard).getByRole("button", { name: "Duplicate" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Product created");
    expect(screen.getByText("Weekend Membership - Copy")).toBeInTheDocument();

    await user.click(within(createdCard).getByRole("button", { name: "Archive" }));
    expect(await screen.findByRole("status")).toHaveTextContent("deactivated");
  });

  it("filters products by status and location", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <SettingsPage />
      </TestProviders>
    );

    await switchStaff(user, "1111");
    await user.click(screen.getByRole("button", { name: "Membership Products" }));
    await user.selectOptions(screen.getByLabelText("Filter membership products by status"), "inactive");
    expect(screen.getAllByText("Inactive").length).toBeGreaterThan(0);
    await user.selectOptions(screen.getByLabelText("Filter membership products by location"), "all");
  });
});

