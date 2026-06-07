import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/badge";

describe("Badge", () => {
  it("renders standardized bordered status tones", () => {
    render(
      <div>
        <Badge tone="success">Active</Badge>
        <Badge tone="warning">Expiring</Badge>
        <Badge tone="danger">Expired</Badge>
      </div>
    );

    expect(screen.getByText("Active").className).toContain("border");
    expect(screen.getByText("Active").className).toContain("emerald");
    expect(screen.getByText("Expiring").className).toContain("amber");
    expect(screen.getByText("Expired").className).toContain("rose");
    expect(screen.getByText("Active").className).toContain("min-h-7");
    expect(screen.getByText("Active").className).toContain("justify-center");
  });
});
