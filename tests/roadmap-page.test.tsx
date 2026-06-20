import { render, screen } from "@testing-library/react";
import RoadmapPage from "@/app/(app)/roadmap/page";

describe("RoadmapPage", () => {
  it("renders the version-based pilot roadmap", () => {
    render(<RoadmapPage />);

    expect(screen.getByRole("heading", { name: "Roadmap" })).toBeInTheDocument();
    expect(screen.getByText("v0.1.0")).toBeInTheDocument();
    expect(screen.getByText("Pilot Readiness & External Testing")).toBeInTheDocument();
    expect(screen.getByText("Platform Foundation")).toBeInTheDocument();
    expect(screen.getByText("Facility Operations")).toBeInTheDocument();
    expect(screen.getByText("Weekly Release Process")).toBeInTheDocument();
    expect(screen.getByText("Reporting dashboards")).toBeInTheDocument();
    expect(screen.getByText("Feedback & Usability")).toBeInTheDocument();
    expect(screen.getByText("Customer Migration & Onboarding")).toBeInTheDocument();
    expect(screen.getByText("Production Ready")).toBeInTheDocument();
    expect(screen.getByText("Stable imports")).toBeInTheDocument();
  });
});
