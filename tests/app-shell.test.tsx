import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { AppShell } from "@/components/layout/app-shell";
import { TestProviders } from "@/tests/test-providers";

vi.mock("next/navigation", () => ({
  usePathname: () => "/o/summit/dashboard",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() })
}));

describe("AppShell", () => {
  it("renders sidebar and main content", () => {
    render(
      <TestProviders>
        <AppShell>
          <div>Page Content</div>
        </AppShell>
      </TestProviders>
    );

    expect(screen.getByText("Facility Ops")).toBeInTheDocument();
    expect(screen.getByText("Page Content")).toBeInTheDocument();
  });
});
