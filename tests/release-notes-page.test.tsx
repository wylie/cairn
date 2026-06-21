import { render, screen } from "@testing-library/react";
import ReleaseNotesPage from "@/app/(app)/release-notes/page";

describe("ReleaseNotesPage", () => {
  it("renders shipped release notes newest first", () => {
    render(<ReleaseNotesPage />);

    expect(screen.getByRole("heading", { name: "Release Notes" })).toBeInTheDocument();
    expect(screen.getByText("Release Type")).toBeInTheDocument();
    expect(screen.getByText("Patch Release Notes Support")).toBeInTheDocument();
    expect(screen.getAllByText("Patch").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Release Notes now support patch-level shipped versions.").length).toBeGreaterThan(0);
    expect(screen.getByText("Patch release notes support")).toBeInTheDocument();
    expect(screen.getAllByText("Minor").length).toBeGreaterThan(0);
    expect(screen.getByText("Real Data Foundation")).toBeInTheDocument();
    expect(screen.getAllByText("Initial real database foundation using Neon.").length).toBeGreaterThan(0);
    expect(screen.getByText("Neon database integration")).toBeInTheDocument();
    expect(screen.getByText("Pilot Readiness Release")).toBeInTheDocument();
    expect(screen.getByText("Stone Cairn branding")).toBeInTheDocument();
    expect(screen.getByText("Versioning and release process foundations")).toBeInTheDocument();
    expect(screen.getByText("Navigation organization")).toBeInTheDocument();
    expect(screen.getByText("Sidebar overflow")).toBeInTheDocument();
    expect(screen.getByText("Notification ordering issues")).toBeInTheDocument();
    expect(screen.getByText("Payment processing not connected")).toBeInTheDocument();
  });
});
