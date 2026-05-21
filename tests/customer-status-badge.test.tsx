import { render, screen } from "@testing-library/react";
import { CustomerStatusBadge } from "@/components/customers/customer-status-badge";

describe("CustomerStatusBadge", () => {
  it("renders checked in state", () => {
    render(<CustomerStatusBadge checkedIn />);
    expect(screen.getByText("Checked In")).toBeInTheDocument();
  });

  it("renders checked out state", () => {
    render(<CustomerStatusBadge checkedIn={false} />);
    expect(screen.getByText("Checked Out")).toBeInTheDocument();
  });
});
