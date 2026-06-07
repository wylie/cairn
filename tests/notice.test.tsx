import { render, screen } from "@testing-library/react";
import { Notice } from "@/components/ui/notice";

describe("Notice", () => {
  it("renders success and warning tones with shared treatment", () => {
    render(
      <div>
        <Notice tone="success" role="status">Saved</Notice>
        <Notice tone="warning" role="alert">Needs attention</Notice>
      </div>
    );

    expect(screen.getByRole("status").className).toContain("border-emerald-200");
    expect(screen.getByRole("alert").className).toContain("border-amber-200");
    expect(screen.getByRole("status").className).toContain("rounded-lg");
  });
});
