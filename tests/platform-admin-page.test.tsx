import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import PlatformAdminDashboardPage from "@/app/admin/page";
import DemoFacilitiesPage from "@/app/admin/demo-facilities/page";
import AdminTemplatesPage from "@/app/admin/templates/page";
import { OrganizationsWorkspace } from "@/components/admin/organizations-workspace";
import { PlatformAdminStateProvider } from "@/lib/state/platform-admin-state";

function AdminProviders({ children }: { children: React.ReactNode }) {
  return <PlatformAdminStateProvider>{children}</PlatformAdminStateProvider>;
}

describe("platform admin pages", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.cookie = "cairn_platform_org_registry=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  });

  it("renders dashboard summary cards", () => {
    render(
      <AdminProviders>
        <PlatformAdminDashboardPage />
      </AdminProviders>
    );

    expect(screen.getByRole("heading", { name: "Platform Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Organizations/i })).toBeInTheDocument();
    expect(screen.getByText(/Provisioning Guarantees/i)).toBeInTheDocument();
  });

  it("renders templates and demo facilities", () => {
    render(
      <AdminProviders>
        <AdminTemplatesPage />
        <DemoFacilitiesPage />
      </AdminProviders>
    );

    expect(screen.getByText("YMCA Template")).toBeInTheDocument();
    expect(screen.getAllByText("Demo Only").length).toBeGreaterThan(0);
  });

  it("surfaces organization billing and support details", () => {
    render(
      <AdminProviders>
        <OrganizationsWorkspace />
      </AdminProviders>
    );

    expect(screen.getAllByText("Summit Rec Collective").length).toBeGreaterThan(0);
    expect(screen.getByText("Multi-Facility")).toBeInTheDocument();
    expect(screen.getByText("Priority Support")).toBeInTheDocument();
    expect(screen.getAllByText(/monthly/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Facilities Included")).toBeInTheDocument();
  });

  it("creates an organization and shows generated assets", async () => {
    const user = userEvent.setup();
    render(
      <AdminProviders>
        <OrganizationsWorkspace />
      </AdminProviders>
    );

    await user.click(screen.getByRole("button", { name: "New Organization" }));
    await user.type(screen.getByLabelText("Organization Name"), "North Shore Camp");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.clear(screen.getByLabelText("Organization Slug"));
    await user.type(screen.getByLabelText("Organization Slug"), "north-shore");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.selectOptions(screen.getByLabelText("Facility Type"), "Camp");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.type(screen.getByLabelText("Primary Location"), "North Shore Base");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.type(screen.getByLabelText("Owner Name"), "Morgan Hale");
    await user.type(screen.getByLabelText("Owner Email"), "morgan@northshore.example.com");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.clear(screen.getByLabelText("Organization Description"));
    await user.type(screen.getByLabelText("Organization Description"), "Seasonal camp operations template.");
    await user.click(screen.getByRole("button", { name: "Provision Organization" }));

    expect(screen.getByRole("status")).toHaveTextContent("North Shore Camp provisioned successfully.");
    expect(screen.getByText("/o/north-shore")).toBeInTheDocument();
    expect(screen.getByText("/p/north-shore")).toBeInTheDocument();
    expect(screen.getByText("/f/north-shore")).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(screen.getByText("Manager")).toBeInTheDocument();
  });
});
