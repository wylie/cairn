import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import IntegrationsPage from "@/app/(app)/integrations/page";
import AdminIntegrationsPage from "@/app/admin/integrations/page";
import { TopBar } from "@/components/layout/top-bar";
import { PlatformAdminStateProvider } from "@/lib/state/platform-admin-state";
import { TestProviders } from "@/tests/test-providers";

vi.mock("next/navigation", () => ({
  usePathname: () => "/o/summit/integrations",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({ orgSlug: "summit" })
}));

async function switchStaff(user: ReturnType<typeof userEvent.setup>, pin: string) {
  await user.click(screen.getByRole("button", { name: "Switch" }));
  await user.type(screen.getByLabelText("Staff PIN input"), pin);
  await user.click(screen.getByRole("button", { name: "Confirm" }));
}

describe("integrations workspace", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("allows owner to manage integrations and generate test webhooks", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <IntegrationsPage />
      </TestProviders>
    );

    await switchStaff(user, "1111");
    expect(screen.getByRole("heading", { name: "Integrations" })).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Disable" })[0]!);
    expect(screen.getByRole("status")).toHaveTextContent(/disabled/i);
    await user.click(screen.getByRole("button", { name: "Generate Webhook" }));
    expect(screen.getByText(/Recent Webhook Deliveries/i)).toBeInTheDocument();
  });

  it("blocks manager from platform-level integrations settings", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <IntegrationsPage />
      </TestProviders>
    );

    await switchStaff(user, "2222");
    expect(screen.getByText("You do not have permission to perform this action.")).toBeInTheDocument();
  });

  it("renders platform admin integrations overview", () => {
    render(
      <PlatformAdminStateProvider>
        <AdminIntegrationsPage />
      </PlatformAdminStateProvider>
    );

    expect(screen.getByRole("heading", { name: "Integrations" })).toBeInTheDocument();
    expect(screen.getByText(/Organization Integration Health/i)).toBeInTheDocument();
  });
});
