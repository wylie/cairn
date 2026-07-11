import { render, screen } from "@testing-library/react";
import ReleaseNotesPage from "@/app/(app)/release-notes/page";

describe("ReleaseNotesPage", () => {
  it("renders shipped release notes newest first", () => {
    render(<ReleaseNotesPage />);

    expect(screen.getByRole("heading", { name: "Release Notes" })).toBeInTheDocument();
    expect(screen.getByText("Customer Operations Stabilization")).toBeInTheDocument();
    expect(screen.getAllByText("Customer and household workflows are stabilized with transactional writes, deterministic repository reads, and focused validation coverage.").length).toBeGreaterThan(0);
    expect(screen.getByText("Customer and household workflow reliability")).toBeInTheDocument();
    expect(screen.getByText("Customer delete and household mutation steps now run transactionally so related customer-household links cannot be partially updated")).toBeInTheDocument();
    expect(screen.getByText("Customer Administration & Data Quality")).toBeInTheDocument();
    expect(screen.getAllByText("Customer and household administration, data-source visibility, repository boundaries, and workflow coverage are finalized for v0.3.x.").length).toBeGreaterThan(0);
    expect(screen.getByText("Customer and household admin diagnostics")).toBeInTheDocument();
    expect(screen.getByText("Repository consistency")).toBeInTheDocument();
    expect(screen.getByText("Customer Experience Improvements")).toBeInTheDocument();
    expect(screen.getAllByText("Customer search, validation, duplicate warnings, and profile clarity are improved for Neon-backed records.").length).toBeGreaterThan(0);
    expect(screen.getByText("Neon-backed customer search")).toBeInTheDocument();
    expect(screen.getByText("Duplicate-customer warnings")).toBeInTheDocument();
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
