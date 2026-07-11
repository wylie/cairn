import { render, screen } from "@testing-library/react";
import ReleaseNotesPage from "@/app/(app)/release-notes/page";

describe("ReleaseNotesPage", () => {
  it("renders shipped release notes newest first", () => {
    render(<ReleaseNotesPage />);

    expect(screen.getByRole("heading", { name: "Release Notes" })).toBeInTheDocument();
    expect(screen.getByText("Household Persistence")).toBeInTheDocument();
    expect(screen.getAllByText("Household CRUD and customer-household relationships now persist through Neon.").length).toBeGreaterThan(0);
    expect(screen.getByText("Neon-backed household CRUD")).toBeInTheDocument();
    expect(screen.getByText("Persisted customer-household relationships")).toBeInTheDocument();
    expect(screen.getByText("Customer Persistence")).toBeInTheDocument();
    expect(screen.getByText("Customer CRUD")).toBeInTheDocument();
    expect(screen.getAllByText("Patch").length).toBeGreaterThan(0);
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
