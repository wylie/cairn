import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LegalPage from "@/app/legal/page";

describe("Legal page", () => {
  it("shows Cairn branding and Argon Collective ownership", () => {
    render(<LegalPage />);
    expect(screen.getByRole("heading", { name: "Legal" })).toBeInTheDocument();
    expect(screen.getByAltText("Cairn")).toHaveAttribute("src", "/branding/cairn-wordmark.svg");
    expect(screen.getAllByText(/Argon Collective LLC/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/© 2026 Argon Collective LLC/i)).toBeInTheDocument();
  });
});
