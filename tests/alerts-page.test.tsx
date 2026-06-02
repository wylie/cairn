import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import AlertsPage from "@/app/(app)/alerts/page";
import { TopBar } from "@/components/layout/top-bar";
import { TestProviders } from "@/tests/test-providers";

vi.mock("next/navigation", () => ({
  usePathname: () => "/alerts",
  useSearchParams: () => new URLSearchParams(window.location.search)
}));

describe("Operations alerts center", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/alerts?status=open");
  });

  it("renders alert metrics and generated alert cards", () => {
    render(
      <TestProviders>
        <TopBar />
        <AlertsPage />
      </TestProviders>
    );

    expect(screen.getByRole("heading", { name: "Operations Alerts" })).toBeInTheDocument();
    expect(screen.getByText("Open Alerts")).toBeInTheDocument();
    expect(screen.getAllByText("Critical").length).toBeGreaterThan(0);
    expect(screen.getByText("Staff Tasks")).toBeInTheDocument();
    expect(screen.getAllByText(/Missing waiver|Expired waiver|Instructor unassigned/i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Resolve Alert" }).length).toBeGreaterThan(0);
  });

  it("resolves alerts and creates follow-up tasks", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <AlertsPage />
      </TestProviders>
    );

    await user.click(screen.getAllByRole("button", { name: "Resolve Alert" })[0]);
    expect(screen.getByRole("status")).toHaveTextContent("Alert resolved.");

    await user.click(screen.getAllByRole("button", { name: "Create Task" })[0]);
    expect(screen.getByRole("status")).toHaveTextContent(/Task created:/i);
  });
});
