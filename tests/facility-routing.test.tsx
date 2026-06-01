import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FacilityLandingPage from "@/app/f/[orgSlug]/page";
import CustomerAccountLayout from "@/app/p/[orgSlug]/account/layout";

describe("facility and portal routing surfaces", () => {
  it("renders facility landing page with customer and staff login links", async () => {
    render(await FacilityLandingPage({ params: Promise.resolve({ orgSlug: "summit" }) }));
    expect(screen.getByRole("link", { name: "Customer Login" })).toHaveAttribute("href", "/p/summit/login");
    expect(screen.getByRole("link", { name: "Staff Login" })).toHaveAttribute("href", "/o/summit/login");
  });

  it("staff portal button from customer account layout uses org-scoped route", async () => {
    render(
      await CustomerAccountLayout({
        children: <div>body</div>,
        params: Promise.resolve({ orgSlug: "summit" })
      })
    );
    expect(screen.getByRole("link", { name: "Staff Portal" })).toHaveAttribute("href", "/o/summit/dashboard");
  });
});
