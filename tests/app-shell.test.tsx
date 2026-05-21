import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { AppShell } from "@/components/layout/app-shell";
import { CustomerStateProvider } from "@/lib/state/customer-state";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard"
}));

describe("AppShell", () => {
  it("renders sidebar and main content", () => {
    render(
      <CustomerStateProvider>
        <AppShell>
          <div>Page Content</div>
        </AppShell>
      </CustomerStateProvider>
    );

    expect(screen.getByText("Facility Ops")).toBeInTheDocument();
    expect(screen.getByText("Page Content")).toBeInTheDocument();
  });
});
