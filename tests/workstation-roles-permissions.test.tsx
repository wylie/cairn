import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, vi } from "vitest";
import { AppShell } from "@/components/layout/app-shell";
import { CheckInList } from "@/components/checkins/checkin-list";
import { TopBar } from "@/components/layout/top-bar";
import { useWorkstationState } from "@/lib/state/workstation-state";
import { TestProviders } from "@/tests/test-providers";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams()
}));

function AuditProbe() {
  const { auditLog, logAuditEvent, activeStaff } = useWorkstationState();
  return (
    <div>
      <p data-testid="audit-count">{auditLog.length}</p>
      <button
        onClick={() => {
          if (!activeStaff) return;
          logAuditEvent({
            action: "test.audit",
            actorStaffId: activeStaff.id,
            actorStaffName: `${activeStaff.firstName} ${activeStaff.lastName}`,
            targetType: "system"
          });
        }}
      >
        Log Test Event
      </button>
    </div>
  );
}

async function switchStaff(user: ReturnType<typeof userEvent.setup>, pin: string) {
  await user.click(screen.getByRole("button", { name: "Switch" }));
  await user.type(screen.getByLabelText("Staff PIN input"), pin);
  await user.click(screen.getByRole("button", { name: "Confirm" }));
}

describe("Role visibility and permission safety", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("instructor role hides POS/Products/Settings/Reports & Analytics nav and keeps Calendar", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <AppShell>
          <div>Page</div>
        </AppShell>
      </TestProviders>
    );

    await switchStaff(user, "4444");

    expect(screen.queryByRole("link", { name: "POS" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Products" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Reports & Analytics" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Settings" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Calendar" })).toBeInTheDocument();
  });

  it("location-restricted staff cannot perform protected actions outside assigned location", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );

    await user.click(screen.getByRole("button", { name: "Switch" }));
    await user.type(screen.getByLabelText("Staff PIN input"), "7777");
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    await user.click(screen.getByRole("button", { name: "Check Out Maya Patel" }));
    expect(screen.getByRole("alert")).toHaveTextContent("You do not have access to this location.");
  });

  it("audit log captures explicit audit events", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <AuditProbe />
      </TestProviders>
    );

    await switchStaff(user, "1111");
    expect(screen.getByTestId("audit-count")).toHaveTextContent("0");
    await user.click(screen.getByRole("button", { name: "Log Test Event" }));
    expect(screen.getByTestId("audit-count")).toHaveTextContent("1");
  });
});
