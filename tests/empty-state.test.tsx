import { render, screen } from "@testing-library/react";
import { EmptyState } from "@/components/shared/empty-state";

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(<EmptyState title="Nothing here" description="Add records to get started" />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByText("Add records to get started")).toBeInTheDocument();
  });

  it("uses the shared friendly empty-state treatment", () => {
    render(<EmptyState title="Nothing here" description="Add records to get started" />);
    const title = screen.getByText("Nothing here");
    const card = title.closest("div[class*='border-dashed']");
    expect(card).toBeTruthy();
    expect(screen.getByText("Add records to get started").className).toContain("max-w-md");
  });
});
