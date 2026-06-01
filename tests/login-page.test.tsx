import fs from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import LoginPage from "@/app/login/page";
import { findMockUser } from "@/lib/auth/mock-users";
import { vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn()
  })
}));

describe("Login page demo helpers", () => {
  it("shows organization-specific staff login chooser", () => {
    render(<LoginPage />);
    expect(screen.getByText("Choose a facility for staff login")).toBeInTheDocument();
    const links = screen.getAllByRole("link", { name: "Staff Login" });
    expect(links[0]).toHaveAttribute("href", "/o/summit/login");
  });

  it("does not render inline credentials in global login chooser", () => {
    render(<LoginPage />);
    expect(screen.queryByText("Demo accounts")).not.toBeInTheDocument();
    expect(screen.queryByText(/Password signs into Cairn/i)).not.toBeInTheDocument();
  });
});

describe("Demo credentials documentation", () => {
  it("includes dev login credentials and PIN/password explanation", () => {
    const docPath = path.resolve(process.cwd(), "docs/demo-credentials.md");
    expect(fs.existsSync(docPath)).toBe(true);
    const contents = fs.readFileSync(docPath, "utf-8");
    expect(contents).toMatch(/taylor@summitrec.co/);
    expect(contents).toMatch(/maya@summitrec.co/);
    expect(contents).toMatch(/sam@summitrec.co/);
    expect(contents).toMatch(/iris@summitrec.co/);
    expect(contents).toMatch(/Login password/);
    expect(contents).toMatch(/Staff PIN/);
  });

  it("staff PIN does not replace password login", () => {
    expect(findMockUser("taylor@summitrec.co", "1111")).toBeNull();
    expect(findMockUser("taylor@summitrec.co", "dev1234")).not.toBeNull();
  });
});
