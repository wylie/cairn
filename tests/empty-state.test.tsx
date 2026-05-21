import { render, screen } from "@testing-library/react";
import { EmptyState } from "@/components/shared/empty-state";

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(<EmptyState title="Nothing here" description="Add records to get started" />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByText("Add records to get started")).toBeInTheDocument();
  });
});
