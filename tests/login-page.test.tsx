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
  it("does not expose a global facility chooser", () => {
    render(<LoginPage />);
    expect(screen.getByText("Staff access is facility-specific")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Staff Login" })).not.toBeInTheDocument();
    expect(screen.queryByText("Summit Rec Collective")).not.toBeInTheDocument();
    expect(screen.queryByText("Riverstone Nature Center")).not.toBeInTheDocument();
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
