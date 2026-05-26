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
    expect(screen.getByTestId("day-grid-layout").className).toContain("w-full");

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
    expect(screen.getAllByText(/Iris Chen/i).length).toBeGreaterThan(0);
  });

  it("week layout uses compact time column and avoids excessive overflow defaults", () => {
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );

    expect(screen.getByTestId("week-grid-layout").className).toContain("grid-cols-[56px_repeat(7,minmax(0,1fr))]");
  });

  it("uses program name by default and shows session title override as secondary text", async () => {
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
    await user.type(within(panel).getByLabelText("Session title"), "Technique Focus");
    await user.selectOptions(within(panel).getByLabelText("Session program"), "prog_101");
    fireEvent.change(within(panel).getByLabelText("Session date"), { target: { value: "2026-05-24" } });
    fireEvent.change(within(panel).getByLabelText("Session start time"), { target: { value: "07:00" } });
    fireEvent.change(within(panel).getByLabelText("Session end time"), { target: { value: "08:00" } });
    await user.click(within(panel).getByRole("button", { name: "Create Session" }));

    await user.click(screen.getByRole("button", { name: "Agenda" }));
    expect(screen.getAllByText("Morning Mobility Flow").length).toBeGreaterThan(0);
    expect(screen.getByText("Technique Focus")).toBeInTheDocument();
  });

  it("prefills session instructor from program default and allows override", async () => {
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
    const instructorSelect = within(panel).getByLabelText("Session instructor") as HTMLSelectElement;
    expect(instructorSelect.value).toBe("staff_004");

    await user.selectOptions(instructorSelect, "staff_002");
    expect(within(panel).getByText(/overridden for this session/i)).toBeInTheDocument();
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

  it("uses shared add control styling in day/week/month views", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );

    const weekAdd = screen.getAllByTestId("calendar-add-slot-button")[0];
    expect(weekAdd.className).toContain("border-dashed");
    expect(weekAdd).toHaveTextContent("+ Add");

    await user.click(screen.getByRole("button", { name: "Day" }));
    const dayAdd = screen.getAllByTestId("calendar-add-slot-button")[0];
    expect(dayAdd.className).toContain("border-dashed");
    expect(dayAdd).toHaveTextContent("+ Add");

    await user.click(screen.getByRole("button", { name: "Month" }));
    const monthAdd = screen.getAllByTestId("calendar-add-slot-button")[0];
    expect(monthAdd.className).toContain("border-dashed");
    expect(monthAdd).toHaveTextContent("+ Add");
  });

  it("keeps month cells at a consistent height and opens overflow agenda", async () => {
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
    await user.type(within(panel).getByLabelText("Session title"), "Overflow A");
    await user.selectOptions(within(panel).getByLabelText("Session program"), "prog_101");
    fireEvent.change(within(panel).getByLabelText("Session date"), { target: { value: "2026-05-24" } });
    fireEvent.change(within(panel).getByLabelText("Session start time"), { target: { value: "07:00" } });
    fireEvent.change(within(panel).getByLabelText("Session end time"), { target: { value: "08:00" } });
    await user.click(within(panel).getByRole("button", { name: "Create Session" }));

    await user.click(screen.getByRole("button", { name: "Create Session" }));
    const panel2 = screen.getByLabelText("session-form-panel");
    await user.type(within(panel2).getByLabelText("Session title"), "Overflow B");
    await user.selectOptions(within(panel2).getByLabelText("Session program"), "prog_101");
    fireEvent.change(within(panel2).getByLabelText("Session date"), { target: { value: "2026-05-24" } });
    fireEvent.change(within(panel2).getByLabelText("Session start time"), { target: { value: "08:00" } });
    fireEvent.change(within(panel2).getByLabelText("Session end time"), { target: { value: "09:00" } });
    await user.click(within(panel2).getByRole("button", { name: "Create Session" }));

    await user.click(screen.getByRole("button", { name: "Create Session" }));
    const panel3 = screen.getByLabelText("session-form-panel");
    await user.type(within(panel3).getByLabelText("Session title"), "Overflow C");
    await user.selectOptions(within(panel3).getByLabelText("Session program"), "prog_101");
    fireEvent.change(within(panel3).getByLabelText("Session date"), { target: { value: "2026-05-24" } });
    fireEvent.change(within(panel3).getByLabelText("Session start time"), { target: { value: "09:00" } });
    fireEvent.change(within(panel3).getByLabelText("Session end time"), { target: { value: "10:00" } });
    await user.click(within(panel3).getByRole("button", { name: "Create Session" }));

    await user.click(screen.getByRole("button", { name: "Create Session" }));
    const panel4 = screen.getByLabelText("session-form-panel");
    await user.type(within(panel4).getByLabelText("Session title"), "Overflow D");
    await user.selectOptions(within(panel4).getByLabelText("Session program"), "prog_101");
    fireEvent.change(within(panel4).getByLabelText("Session date"), { target: { value: "2026-05-24" } });
    fireEvent.change(within(panel4).getByLabelText("Session start time"), { target: { value: "10:00" } });
    fireEvent.change(within(panel4).getByLabelText("Session end time"), { target: { value: "11:00" } });
    await user.click(within(panel4).getByRole("button", { name: "Create Session" }));

    fireEvent.change(screen.getByLabelText("Calendar jump date"), { target: { value: "2026-05-24" } });
    await user.click(screen.getByRole("button", { name: "Month" }));

    const monthCells = screen.getAllByTestId("month-day-cell");
    expect(monthCells[0].className).toContain("h-44");
    expect(screen.getByTestId("month-overflow-trigger")).toBeInTheDocument();

    await user.click(screen.getByTestId("month-overflow-trigger"));
    expect(screen.getByTestId("month-overflow-panel")).toBeInTheDocument();
    expect(screen.getByText("Overflow D")).toBeInTheDocument();
  });

  it("clicking month date opens day agenda panel instead of switching to day view", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );

    await user.click(screen.getByRole("button", { name: "Month" }));
    await user.click(screen.getByRole("button", { name: "5/21" }));

    expect(screen.getByTestId("month-overflow-panel")).toBeInTheDocument();
    expect(screen.getByTestId("month-grid")).toBeInTheDocument();
  });

  it("month day agenda View Day button intentionally switches to day view", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );

    await user.click(screen.getByRole("button", { name: "Month" }));
    await user.click(screen.getByRole("button", { name: "5/21" }));
    await user.click(within(screen.getByTestId("month-overflow-panel")).getByRole("button", { name: "View Day" }));

    expect(screen.getByTestId("day-grid")).toBeInTheDocument();
    expect(screen.queryByTestId("month-overflow-panel")).not.toBeInTheDocument();
  });

  it("month add button appears near top of day cell and overflow still works", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );
    await activateStaff(user);

    for (const [title, start, end] of [
      ["Top Add A", "07:00", "08:00"],
      ["Top Add B", "08:00", "09:00"],
      ["Top Add C", "09:00", "10:00"],
      ["Top Add D", "10:00", "11:00"]
    ] as const) {
      await user.click(screen.getByRole("button", { name: "Create Session" }));
      const createPanel = screen.getByLabelText("session-form-panel");
      await user.type(within(createPanel).getByLabelText("Session title"), title);
      await user.selectOptions(within(createPanel).getByLabelText("Session program"), "prog_101");
      fireEvent.change(within(createPanel).getByLabelText("Session date"), { target: { value: "2026-05-24" } });
      fireEvent.change(within(createPanel).getByLabelText("Session start time"), { target: { value: start } });
      fireEvent.change(within(createPanel).getByLabelText("Session end time"), { target: { value: end } });
      await user.click(within(createPanel).getByRole("button", { name: "Create Session" }));
    }

    fireEvent.change(screen.getByLabelText("Calendar jump date"), { target: { value: "2026-05-24" } });
    await user.click(screen.getByRole("button", { name: "Month" }));

    const targetDate = screen.getByRole("button", { name: "5/24" });
    const targetCell = targetDate.closest("[data-testid='month-day-cell']");
    if (!targetCell) throw new Error("Expected month cell for 5/24");

    const addButton = within(targetCell).getByRole("button", { name: "+ Add" });
    const firstSessionLabel = within(targetCell).getAllByText(/Top Add/i)[0];
    const cellText = targetCell.textContent ?? "";
    expect(cellText.indexOf("+ Add")).toBeGreaterThan(-1);
    expect(cellText.indexOf("+ Add")).toBeLessThan(cellText.indexOf(firstSessionLabel.textContent ?? ""));

    expect(screen.getByTestId("month-overflow-trigger")).toBeInTheDocument();
  });

  it("adds a session from month overflow agenda with date prefilled", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );
    await activateStaff(user);

    for (const [title, start, end] of [
      ["Month Add A", "07:00", "08:00"],
      ["Month Add B", "08:00", "09:00"],
      ["Month Add C", "09:00", "10:00"],
      ["Month Add D", "10:00", "11:00"]
    ] as const) {
      await user.click(screen.getByRole("button", { name: "Create Session" }));
      const createPanel = screen.getByLabelText("session-form-panel");
      await user.type(within(createPanel).getByLabelText("Session title"), title);
      await user.selectOptions(within(createPanel).getByLabelText("Session program"), "prog_101");
      fireEvent.change(within(createPanel).getByLabelText("Session date"), { target: { value: "2026-05-24" } });
      fireEvent.change(within(createPanel).getByLabelText("Session start time"), { target: { value: start } });
      fireEvent.change(within(createPanel).getByLabelText("Session end time"), { target: { value: end } });
      await user.click(within(createPanel).getByRole("button", { name: "Create Session" }));
    }

    fireEvent.change(screen.getByLabelText("Calendar jump date"), { target: { value: "2026-05-24" } });
    await user.click(screen.getByRole("button", { name: "Month" }));
    await user.click(screen.getByTestId("month-overflow-trigger"));
    const overflowPanel = screen.getByTestId("month-overflow-panel");
    await user.click(within(overflowPanel).getAllByRole("button", { name: "Add Session" })[0]);

    const panel = screen.getByLabelText("session-form-panel");
    expect(within(panel).getByLabelText("Session date")).toHaveValue("2026-05-24");
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
    expect(screen.getByText(/Waitlist roster/i)).toBeInTheDocument();
    expect(screen.getByText(/#1/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Promote" }));
    expect(screen.getByText(/promoted/i)).toBeInTheDocument();
  });

  it("routes additional registrations to waitlist when session is full", async () => {
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
    await user.type(within(panel).getByLabelText("Session title"), "Waitlist Capacity Test");
    await user.selectOptions(within(panel).getByLabelText("Session program"), "prog_101");
    fireEvent.change(within(panel).getByLabelText("Session date"), { target: { value: "2026-05-24" } });
    fireEvent.change(within(panel).getByLabelText("Session start time"), { target: { value: "07:00" } });
    fireEvent.change(within(panel).getByLabelText("Session end time"), { target: { value: "08:00" } });
    await user.clear(within(panel).getByLabelText("Session capacity"));
    await user.type(within(panel).getByLabelText("Session capacity"), "1");
    await user.click(within(panel).getByRole("button", { name: "Create Session" }));

    fireEvent.change(screen.getByLabelText("Calendar jump date"), { target: { value: "2026-05-24" } });
    await user.click(screen.getByRole("button", { name: "Agenda" }));
    const sessionRowTitle = screen.getByText(/^Waitlist Capacity Test$/i);
    const sessionRow = sessionRowTitle.closest("article");
    if (!sessionRow) {
      throw new Error("Expected agenda session row for waitlist capacity test session.");
    }
    await user.click(within(sessionRow).getByRole("button", { name: "Open" }));

    await user.type(screen.getByLabelText("Session customer search"), "Maya");
    await user.click(screen.getByRole("option", { name: /M-1001/i }));

    await user.type(screen.getByLabelText("Session customer search"), "Jordan");
    await user.click(screen.getByRole("option", { name: /M-1002/i }));

    expect(screen.getByText(/added to waitlist/i)).toBeInTheDocument();
    expect(screen.getByText(/Waitlist roster/i)).toBeInTheDocument();
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
