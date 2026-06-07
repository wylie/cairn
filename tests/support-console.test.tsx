import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SupportConsolePage from "@/app/admin/support/page";
import { AUTH_COOKIE, encodeSession } from "@/lib/auth/session";
import { PlatformAdminStateProvider } from "@/lib/state/platform-admin-state";
import { SupportStateProvider } from "@/lib/state/support-state";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh })
}));

describe("support console", () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    window.localStorage.clear();
    document.cookie = `${AUTH_COOKIE}=${encodeSession({ userId: "auth_support_staff", email: "support@cairn.app", organizationSlugs: [], kind: "support_staff" })}; path=/`;
  });

  it("renders facility health and can start a support session", async () => {
    const user = userEvent.setup();
    render(
      <SupportStateProvider>
        <PlatformAdminStateProvider>
          <SupportConsolePage />
        </PlatformAdminStateProvider>
      </SupportStateProvider>
    );

    expect(screen.getByRole("heading", { name: "Support Console" })).toBeInTheDocument();
    expect(screen.getAllByText("Summit Rec Collective").length).toBeGreaterThan(0);
    expect(screen.getByText(/Transparent support access/i)).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Start Support Session" })[0]);
    await user.type(screen.getByLabelText("Reason for support session"), "Investigating a check-in blocker for the front desk.");
    await user.click(screen.getByRole("button", { name: "Start Session" }));

    expect(push).toHaveBeenCalledWith("/o/summit/dashboard");
    expect(refresh).toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Support session started for Summit Rec Collective");
  });
});
