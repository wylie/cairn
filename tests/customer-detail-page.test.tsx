import { render, screen } from "@testing-library/react";
import CustomerDetailPage from "@/app/(app)/customers/[id]/page";

describe("CustomerDetailPage", () => {
  it("renders expected sections", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(page);

    expect(screen.getByLabelText("detail-header")).toBeInTheDocument();
    expect(screen.getByLabelText("detail-membership")).toBeInTheDocument();
    expect(screen.getByLabelText("detail-waivers")).toBeInTheDocument();
    expect(screen.getByLabelText("detail-activity")).toBeInTheDocument();
    expect(screen.getByLabelText("detail-notes")).toBeInTheDocument();
    expect(screen.getByLabelText("detail-billing")).toBeInTheDocument();
  });

  it("shows visit history with entry method and punch details", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_002" }) });
    render(page);

    expect(screen.getAllByText(/Entry method: multi visit pass/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Punches used: 1/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Punches remaining: 8/i)).toBeInTheDocument();
  });

  it("renders header action buttons", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(page);

    expect(screen.getByRole("button", { name: "Check Out" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit Profile" })).toBeInTheDocument();
  });
});
