import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import CalendarPage from "@/app/(app)/calendar/page";
import { TopBar } from "@/components/layout/top-bar";
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
      }),
      clear: vi.fn(() => {
        store.clear();
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

async function activateStaff(user: ReturnType<typeof userEvent.setup>, pin = "2222") {
  await user.click(screen.getAllByRole("button", { name: "Switch" })[0]);
  await user.type(screen.getByLabelText("Staff PIN input"), pin);
  await user.click(screen.getByRole("button", { name: "Confirm" }));
}

describe("Calendar interactive workstation", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("renders week view with navigation controls by default", () => {
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );

    expect(screen.getByRole("heading", { name: "Schedule" })).toBeInTheDocument();
    expect(screen.getByTestId("week-grid")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
    expect(screen.getByLabelText("Calendar jump date")).toBeInTheDocument();
    expect(screen.getByTestId("calendar-view-toggle")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Day" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Week" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Month" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Agenda" })).toHaveLength(1);
  });

  it("uses consistent calendar/sidebar layout sizing hooks", () => {
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );

    expect(screen.getByTestId("calendar-layout")).toBeInTheDocument();
    expect(screen.getByTestId("calendar-sidebar")).toBeInTheDocument();
  });

  it("applies button hierarchy in calendar controls", () => {
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );

    expect(screen.getByRole("button", { name: "Create Session" }).className).toContain("bg-primary");
    expect(screen.getByRole("button", { name: "Previous" }).className).toContain("border");
    expect(screen.getByRole("button", { name: "Week" }).className).toContain("bg-primary");
  });

  it("switches between day, week, month, and agenda views", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );

    await user.click(screen.getByRole("button", { name: "Day" }));
    expect(screen.getByTestId("day-grid")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Month" }));
    expect(screen.getByTestId("month-grid")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Agenda" }));
    expect(screen.getByTestId("agenda-list")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Week" }));
    expect(screen.getByTestId("week-grid")).toBeInTheDocument();
  });

  it("renders visual session blocks with registration/capacity details", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );

    await user.click(screen.getByRole("button", { name: "Agenda" }));
    expect(screen.getByText(/Morning Mobility Flow/i)).toBeInTheDocument();
    expect(screen.getByText(/14\/20|14 \/ 20|14\/ 20|14 \/20/i)).toBeInTheDocument();
  });

  it("opens session detail from a visual block", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );

    await user.click(screen.getByRole("button", { name: "Agenda" }));
    await user.click(screen.getAllByRole("button", { name: "Open" })[0]);
    expect(screen.getByLabelText("session-detail-panel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Take Attendance" })).toBeInTheDocument();
  });

  it("creates a session by clicking empty calendar slot", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );
    await activateStaff(user);

    await user.click(screen.getAllByRole("button", { name: "+ Add" })[0]);
    const panel = screen.getByLabelText("session-form-panel");
    expect(panel).toBeInTheDocument();
    expect(within(panel).getByLabelText("Session date")).toHaveValue("2026-05-17");

    await user.type(within(panel).getByLabelText("Session title"), "Slot Created Session");
    await user.selectOptions(within(panel).getByLabelText("Session program"), "prog_101");
    await user.clear(within(panel).getByLabelText("Session capacity"));
    await user.type(within(panel).getByLabelText("Session capacity"), "10");
    await user.click(within(panel).getByRole("button", { name: "Create Session" }));

    expect(screen.getByText(/Session created\./i)).toBeInTheDocument();
  });

  it("creates recurring sessions", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );
    await activateStaff(user);

    await user.click(screen.getByRole("button", { name: "Create Session" }));
    const panel = screen.getByLabelText("session-form-panel");
    await user.type(within(panel).getByLabelText("Session title"), "Recurring Team Session");
    await user.selectOptions(within(panel).getByLabelText("Session program"), "prog_101");
    fireEvent.change(within(panel).getByLabelText("Session date"), { target: { value: "2026-05-24" } });
    fireEvent.change(within(panel).getByLabelText("Session start time"), { target: { value: "07:00" } });
    fireEvent.change(within(panel).getByLabelText("Session end time"), { target: { value: "08:00" } });
    await user.selectOptions(within(panel).getByLabelText("Session recurrence"), "weekly");
    await user.clear(within(panel).getByLabelText("Session recurrence count"));
    await user.type(within(panel).getByLabelText("Session recurrence count"), "3");
    await user.click(within(panel).getByRole("button", { name: "Create Session" }));

    expect(screen.getByText(/Created 3 recurring sessions\./i)).toBeInTheDocument();
  });

  it("manages roster and attendance from session detail", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );
    await activateStaff(user);

    await user.click(screen.getByRole("button", { name: "Agenda" }));
    await user.click(screen.getAllByRole("button", { name: "Open" })[0]);
    await user.type(screen.getByLabelText("Session customer search"), "Maya");
    await user.click(screen.getByRole("option", { name: /Maya Patel/i }));
    expect(screen.getByText(/Registration confirmed for Maya Patel/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Mark all present" }));
    expect(screen.getByRole("status")).toHaveTextContent(/Marked/i);
  });

  it("moves registrations to waitlist and promotes waitlisted participants", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );
    await activateStaff(user);

    await user.click(screen.getByRole("button", { name: "Agenda" }));
    await user.click(screen.getAllByRole("button", { name: "Open" })[0]);
    await user.click(screen.getAllByRole("button", { name: "Move to Waitlist" })[0]);
    expect(screen.getByText(/Registration moved to waitlist\./i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Promote to Registered" }));
    expect(screen.getByText(/promoted/i)).toBeInTheDocument();
  });

  it("persists created sessions after refresh", async () => {
    const storage = installStorageMock();
    const user = userEvent.setup();

    const first = render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );
    await activateStaff(user);

    await user.click(screen.getByRole("button", { name: "Create Session" }));
    const createPanel = screen.getByLabelText("session-form-panel");
    await user.type(within(createPanel).getByLabelText("Session title"), "Persisted Session");
    await user.selectOptions(within(createPanel).getByLabelText("Session program"), "prog_101");
    fireEvent.change(within(createPanel).getByLabelText("Session date"), { target: { value: "2026-05-23" } });
    fireEvent.change(within(createPanel).getByLabelText("Session start time"), { target: { value: "08:00" } });
    fireEvent.change(within(createPanel).getByLabelText("Session end time"), { target: { value: "09:00" } });
    await user.click(within(createPanel).getByRole("button", { name: "Create Session" }));

    first.unmount();

    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );

    await user.click(screen.getByRole("button", { name: "Agenda" }));
    expect(screen.getByText(/Persisted Session/i)).toBeInTheDocument();
    storage.restore();
  });
});
