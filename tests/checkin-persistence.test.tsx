import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { CheckInList } from "@/components/checkins/checkin-list";
import { TopBar } from "@/components/layout/top-bar";
import PosPage from "@/app/(app)/pos/page";
import { buildScopedMockKey } from "@/lib/mock-storage";
import { TestProviders } from "@/tests/test-providers";

function installStorageMock() {
  const store = new Map<string, string>();
  const original = window.localStorage;

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        store.delete(key);
      })
    }
  });

  return {
    restore() {
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        value: original
      });
    }
  };
}

async function switchStaff(user: ReturnType<typeof userEvent.setup>, pin: string) {
  await user.click(screen.getAllByRole("button", { name: "Switch" })[0]);
  await user.type(screen.getByLabelText("Staff PIN input"), pin);
  await user.click(screen.getByRole("button", { name: "Confirm" }));
}

describe("Check-in persistence", () => {
  it("new check-in remains after simulated reload and occupancy stays correct", async () => {
    const storage = installStorageMock();
    const user = userEvent.setup();

    const first = render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );

    await switchStaff(user, "2222");
    await user.type(screen.getByLabelText("Scan barcode, member ID, phone, email, or search name"), "Dana");
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: "Check In" }));

    expect(screen.getByTestId("checkin-row-cust_005")).toBeInTheDocument();
    expect(screen.getByTestId("header-occupancy")).toHaveTextContent("2 currently in");

    first.unmount();

    render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );

    expect(screen.getByTestId("checkin-row-cust_005")).toBeInTheDocument();
    expect(screen.getByTestId("header-occupancy")).toHaveTextContent("2 currently in");
    expect(screen.getByTestId("active-staff-label")).toHaveTextContent("Maya Lopez");

    storage.restore();
  });

  it("check-out state remains after simulated reload", async () => {
    const storage = installStorageMock();
    const user = userEvent.setup();

    const first = render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );

    await switchStaff(user, "1111");
    await user.click(screen.getByRole("button", { name: "Check Out Maya Patel" }));

    const row = screen.getByTestId("checkin-row-cust_001");
    expect(within(row).getByText("Checked Out")).toBeInTheDocument();

    first.unmount();

    render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );

    const reloaded = screen.getByTestId("checkin-row-cust_001");
    expect(within(reloaded).getByText("Checked Out")).toBeInTheDocument();

    storage.restore();
  });

  it("punch-pass usage remains after reload", async () => {
    const storage = installStorageMock();
    const user = userEvent.setup();

    const first = render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );

    await switchStaff(user, "1111");
    await user.type(screen.getByLabelText("Scan barcode, member ID, phone, email, or search name"), "Jordan");
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: "Check In" }));

    first.unmount();

    render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );

    const row = screen.getByTestId("checkin-row-cust_002");
    expect(within(row).getByText(/Remaining: 6/i)).toBeInTheDocument();

    storage.restore();
  });

  it("loads seeded records when no saved state exists", () => {
    const storage = installStorageMock();

    render(
      <TestProviders>
        <TopBar />
        <CheckInList />
      </TestProviders>
    );

    expect(screen.getByTestId("checkin-row-cust_001")).toBeInTheDocument();

    const checkInKey = buildScopedMockKey("org_summit", "loc_001", "checkIns");
    expect(window.localStorage.getItem(checkInKey)).not.toBeNull();

    storage.restore();
  });

  it("waiver status updates persist after reload", async () => {
    const storage = installStorageMock();
    const user = userEvent.setup();

    const first = render(
      <TestProviders>
        <TopBar />
        <PosPage />
      </TestProviders>
    );

    await switchStaff(user, "2222");
    await user.type(screen.getByLabelText("Search customer"), "Sam");
    await user.keyboard("{ArrowDown}{Enter}");
    await user.click(screen.getByRole("button", { name: "Add Day Pass" }));
    await user.click(screen.getByRole("button", { name: "Complete" }));
    await user.click(screen.getByRole("button", { name: "Mark Waiver Signed" }));
    expect(screen.getByText(/Waiver marked valid/i)).toBeInTheDocument();

    first.unmount();

    render(
      <TestProviders>
        <TopBar />
        <PosPage />
      </TestProviders>
    );

    await user.type(screen.getByLabelText("Search customer"), "Sam");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(screen.getByText("Waiver: Valid")).toBeInTheDocument();

    storage.restore();
  });
});
