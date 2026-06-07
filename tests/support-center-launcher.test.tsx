import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SupportCenterLauncher } from "@/components/support/support-center-launcher";
import { SupportStateProvider } from "@/lib/state/support-state";

vi.mock("next/navigation", () => ({
  usePathname: () => "/o/summit/check-in"
}));

describe("support center launcher", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.cookie = "cairn_support_requests_v1=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  });

  it("submits a support request with trust messaging", async () => {
    const user = userEvent.setup();
    render(
      <SupportStateProvider>
        <SupportCenterLauncher />
      </SupportStateProvider>
    );

    await user.click(screen.getByRole("button", { name: /Need Help\?/i }));
    await user.type(screen.getByLabelText("Name"), "Morgan Hale");
    await user.type(screen.getByLabelText("Email"), "morgan@example.com");
    await user.selectOptions(screen.getByLabelText("Category"), "feature_request");
    await user.type(screen.getByLabelText("Title"), "Family registration shortcuts");
    await user.type(screen.getByLabelText("Workflow affected"), "Registrations");
    await user.type(screen.getByLabelText("Business impact"), "Reduces staff re-entry");
    await user.type(screen.getByLabelText("Description"), "Need a faster household registration flow.");
    await user.click(screen.getByRole("button", { name: "Submit Request" }));

    expect(screen.getByRole("status")).toHaveTextContent("Support request submitted");
    expect(screen.getByRole("status")).toHaveTextContent("support sessions are always logged");
  });
});
