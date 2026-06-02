import { render, screen } from "@testing-library/react";
import DashboardPage from "@/app/(app)/dashboard/page";
import { TopBar } from "@/components/layout/top-bar";
import { TestProviders } from "@/tests/test-providers";

describe("Dashboard command center", () => {
  it("renders command center sections", () => {
    render(
      <TestProviders>
        <TopBar />
        <DashboardPage />
      </TestProviders>
    );

    expect(screen.getByRole("heading", { name: "Today Command Center" })).toBeInTheDocument();
    expect(screen.getByText("Needs Attention")).toBeInTheDocument();
    expect(screen.getByText("Quick Actions")).toBeInTheDocument();
    expect(screen.getByText("Today's Schedule")).toBeInTheDocument();
    expect(screen.getByText("Facility Pulse")).toBeInTheDocument();
  });

  it("renders actionable metric links with destination hints", () => {
    render(
      <TestProviders>
        <TopBar />
        <DashboardPage />
      </TestProviders>
    );

    expect(screen.getByRole("link", { name: /open alerts/i })).toHaveAttribute("href", "/alerts?status=open");
    expect(screen.getByRole("link", { name: /critical alerts/i })).toHaveAttribute("href", "/alerts?status=open&severity=critical");
    expect(screen.getByRole("link", { name: /tasks due today/i })).toHaveAttribute("href", "/alerts?taskStatus=open&due=today");
    expect(screen.getByRole("link", { name: /currently checked in/i })).toHaveAttribute("href", "/check-in#current-roster");
    expect(screen.getByRole("link", { name: /today's check-ins/i })).toHaveAttribute("href", "/check-in#recent-checkins");
    expect(screen.getByRole("link", { name: /today's registrations/i })).toHaveAttribute("href", "/registrations?created=today");
    expect(screen.getByRole("link", { name: /waivers missing/i })).toHaveAttribute("href", "/customers?waiver=missing");
    expect(screen.getByRole("link", { name: /today's revenue/i })).toHaveAttribute("href", "/reports?category=sales&range=today");

    expect(screen.getByText("View Check-In →")).toBeInTheDocument();
    expect(screen.getByText("Open Alerts →")).toBeInTheDocument();
    expect(screen.getByText("Open Revenue Report →")).toBeInTheDocument();
    expect(screen.getByText("View affected customers →")).toBeInTheDocument();
  });

  it("links schedule cards and health widgets into operational workspaces", () => {
    render(
      <TestProviders>
        <TopBar />
        <DashboardPage />
      </TestProviders>
    );

    expect(screen.getByRole("link", { name: /membership health/i })).toHaveAttribute("href", "/memberships");
    expect(screen.getByRole("link", { name: /program health/i })).toHaveAttribute("href", "/registrations");
    expect(screen.getByRole("link", { name: /waiver health/i })).toHaveAttribute("href", "/waivers");
    expect(screen.getByRole("link", { name: /financial snapshot/i })).toHaveAttribute("href", "/reports?category=sales&range=today");
    expect(screen.getByRole("link", { name: /household health/i })).toHaveAttribute("href", "/households");
    expect(screen.getByText("Recent household activity")).toBeInTheDocument();

    const scheduleLinks = screen.getAllByRole("link", { name: /open registration detail →/i });
    expect(scheduleLinks.length).toBeGreaterThan(0);
    expect(scheduleLinks[0].getAttribute("href")).toContain("/registrations?sessionId=");
  });
});
