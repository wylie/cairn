import { render, screen } from "@testing-library/react";
import CustomerDetailPage from "@/app/(app)/customers/[id]/page";
import { TestProviders } from "@/tests/test-providers";

describe("CustomerDetailPage", () => {
  it("renders expected sections", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(<TestProviders>{page}</TestProviders>);

    expect(screen.getByLabelText("detail-header")).toBeInTheDocument();
    expect(screen.getByLabelText("detail-membership")).toBeInTheDocument();
    expect(screen.getByLabelText("detail-access")).toBeInTheDocument();
    expect(screen.getByLabelText("detail-waivers")).toBeInTheDocument();
    expect(screen.getByLabelText("detail-activity")).toBeInTheDocument();
    expect(screen.getByLabelText("detail-notes")).toBeInTheDocument();
    expect(screen.getByLabelText("detail-purchases")).toBeInTheDocument();
    expect(screen.getByLabelText("detail-sessions")).toBeInTheDocument();
    expect(screen.getByLabelText("detail-billing")).toBeInTheDocument();
  });

  it("renders upcoming and past session history", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(<TestProviders>{page}</TestProviders>);

    expect(screen.getAllByText(/Upcoming Sessions/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Past Sessions/i).length).toBeGreaterThan(0);
  });

  it("shows visit history with entry method and punch details", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_002" }) });
    render(<TestProviders>{page}</TestProviders>);

    expect(screen.getAllByText(/Entry method: multi visit pass/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Punches used: 1/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Punches remaining: 8/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Checked in by: Taylor Nguyen/i).length).toBeGreaterThan(0);
  });

  it("renders header action buttons", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(<TestProviders>{page}</TestProviders>);

    expect(screen.getByRole("button", { name: "Check Out" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sell Access" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit Profile" })).toBeInTheDocument();
  });

  it("shows itemized purchase history with prices and totals", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_003" }) });
    render(<TestProviders>{page}</TestProviders>);

    expect(screen.getByText(/Class Drop-In x1 — \$26.00 \(\$26.00\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Total: \$26.00/i)).toBeInTheDocument();
    expect(screen.getByText(/Receipt #R-LEGACY/i)).toBeInTheDocument();
  });

  it("shows access events in activity timeline", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_002" }) });
    render(<TestProviders>{page}</TestProviders>);

    expect(screen.getByText(/Access active/i)).toBeInTheDocument();
  });
});
