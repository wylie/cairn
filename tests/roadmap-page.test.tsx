import { render, screen } from "@testing-library/react";
import RoadmapPage from "@/app/(app)/roadmap/page";

describe("RoadmapPage", () => {
  it("renders the milestone-based roadmap", () => {
    render(<RoadmapPage />);

    expect(screen.getByRole("heading", { name: "Roadmap" })).toBeInTheDocument();
    expect(screen.getByText("Current v0.5.0")).toBeInTheDocument();
    expect(screen.getByText("CI/CD")).toBeInTheDocument();
    expect(screen.getByText("Semantic Versioning")).toBeInTheDocument();
    expect(screen.getByText("v0.2.x")).toBeInTheDocument();
    expect(screen.getByText("Real Data Foundation")).toBeInTheDocument();
    expect(screen.getByText("Data classification")).toBeInTheDocument();
    expect(screen.getByText("Customer Operations")).toBeInTheDocument();
    expect(screen.getByText("Neon-backed customer management")).toBeInTheDocument();
    expect(screen.getByText("Customer Experience")).toBeInTheDocument();
    expect(screen.getByText("Neon-backed customer search")).toBeInTheDocument();
    expect(screen.getByText("Persisted customer-household relationships")).toBeInTheDocument();
    expect(screen.getByText("Admin diagnostics")).toBeInTheDocument();
    expect(screen.getByText("Data-source migration")).toBeInTheDocument();
    expect(screen.getByText("Memberships & Check-In")).toBeInTheDocument();
    expect(screen.getByText("Centralized access rules")).toBeInTheDocument();
    expect(screen.getByText("Access-decision clarity")).toBeInTheDocument();
    expect(screen.getByText("Programs & Registrations")).toBeInTheDocument();
    expect(screen.getByText("Capacity management")).toBeInTheDocument();
    expect(screen.getByText("Customer & Household Operations")).toBeInTheDocument();
    expect(screen.getByText("Pilot Readiness")).toBeInTheDocument();
    expect(screen.getByText("Production Ready")).toBeInTheDocument();
    expect(screen.getByText("Operational readiness")).toBeInTheDocument();
  });
});
