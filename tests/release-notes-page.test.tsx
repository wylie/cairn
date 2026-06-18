import { render, screen } from "@testing-library/react";
import ReleaseNotesPage from "@/app/(app)/release-notes/page";

describe("ReleaseNotesPage", () => {
  it("renders the current pilot release notes", () => {
    render(<ReleaseNotesPage />);

    expect(screen.getByRole("heading", { name: "Release Notes" })).toBeInTheDocument();
    expect(screen.getByText("Cairn v0.1.0")).toBeInTheDocument();
    expect(screen.getByText("Pilot Readiness Release")).toBeInTheDocument();
    expect(screen.getByText("Stone Cairn branding")).toBeInTheDocument();
    expect(screen.getByText("Navigation organization")).toBeInTheDocument();
    expect(screen.getByText("Sidebar overflow")).toBeInTheDocument();
    expect(screen.getByText("Payment processing not connected")).toBeInTheDocument();
  });
});
