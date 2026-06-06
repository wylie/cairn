import { render, screen } from "@testing-library/react";
import { beforeEach } from "vitest";
import { vi } from "vitest";
import { AppShell } from "@/components/layout/app-shell";
import { TestProviders } from "@/tests/test-providers";
import { ORG_REGISTRY_COOKIE, buildProvisionedOrganization } from "@/lib/platform-admin/registry";

let mockPathname = "/o/summit/dashboard";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() })
}));

describe("AppShell", () => {
  beforeEach(() => {
    mockPathname = "/o/summit/dashboard";
    window.localStorage.clear();
    document.cookie = `${ORG_REGISTRY_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
    });
  });

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

  it("uses runtime provisioned organizations for the shell heading", () => {
    const record = buildProvisionedOrganization({
      name: "North Shore Camp",
      slug: "north-shore",
      facilityType: "Camp",
      primaryLocationName: "North Shore Base",
      ownerName: "Morgan Hale",
      ownerEmail: "morgan@northshore.example.com",
      primaryColor: "#0E9AC8",
      secondaryColor: "#1F2937",
      description: ""
    });
    window.localStorage.setItem("cairn_platform_org_registry", JSON.stringify([record]));
    document.cookie = `${ORG_REGISTRY_COOKIE}=${encodeURIComponent(JSON.stringify([record]))}; path=/`;
    mockPathname = "/o/north-shore/dashboard";

    render(
      <TestProviders>
        <AppShell>
          <div>Provisioned Org</div>
        </AppShell>
      </TestProviders>
    );

    expect(screen.getByRole("heading", { name: "North Shore Camp" })).toBeInTheDocument();
  });

  it("renders mobile navigation and quick actions on smaller screens", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(max-width: 1023px)",
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
    });

    render(
      <TestProviders>
        <AppShell>
          <div>Page Content</div>
        </AppShell>
      </TestProviders>
    );

    expect(screen.getByTestId("mobile-staff-mode-banner")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-staff-navigation")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open quick actions/i })).toBeInTheDocument();
  });
});
