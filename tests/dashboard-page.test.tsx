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
});
