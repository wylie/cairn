import { render, screen } from "@testing-library/react";
import ReleaseNotesPage from "@/app/(app)/release-notes/page";

describe("ReleaseNotesPage", () => {
  it("renders the current pilot release notes", () => {
    render(<ReleaseNotesPage />);

    expect(screen.getByRole("heading", { name: "Release Notes" })).toBeInTheDocument();
    expect(screen.getByText("Current released version")).toBeInTheDocument();
    expect(screen.getByText("Current released v0.1.0")).toBeInTheDocument();
    expect(screen.getByText("Real Data Foundation")).toBeInTheDocument();
    expect(screen.getByText(/has not been released yet/i)).toBeInTheDocument();
    expect(screen.getByText("Neon database foundation")).toBeInTheDocument();
    expect(screen.getByText("Pilot Readiness Release")).toBeInTheDocument();
    expect(screen.getAllByText("Released").length).toBeGreaterThan(0);
    expect(screen.getByText("Stone Cairn branding")).toBeInTheDocument();
    expect(screen.getByText("Versioning and release process foundations")).toBeInTheDocument();
    expect(screen.getByText("Navigation organization")).toBeInTheDocument();
    expect(screen.getByText("Sidebar overflow")).toBeInTheDocument();
    expect(screen.getByText("Notification ordering issues")).toBeInTheDocument();
    expect(screen.getByText("Payment processing not connected")).toBeInTheDocument();
  });
});
