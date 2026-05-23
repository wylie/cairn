import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";

describe("Button variants", () => {
  it("renders semantic variants with expected classes", () => {
    render(
      <div>
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="caution">Caution</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="ghost">Ghost</Button>
      </div>
    );

    expect(screen.getByRole("button", { name: "Primary" }).className).toContain("bg-primary");
    expect(screen.getByRole("button", { name: "Secondary" }).className).toContain("border");
    expect(screen.getByRole("button", { name: "Caution" }).className).toContain("amber");
    expect(screen.getByRole("button", { name: "Destructive" }).className).toContain("rose");
    expect(screen.getByRole("button", { name: "Ghost" }).className).toContain("hover:bg-secondary");
  });
});

