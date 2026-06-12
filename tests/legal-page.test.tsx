import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LegalPage from "@/app/legal/page";

describe("Legal page", () => {
  it("shows Stone Cairn branding and Argon Collective ownership", () => {
    render(<LegalPage />);
    expect(screen.getByRole("heading", { name: "Legal" })).toBeInTheDocument();
    expect(screen.getAllByText(/Built by Stone Cairn/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Argon Collective LLC/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/© 2026 Argon Collective LLC/i)).toBeInTheDocument();
  });
});
