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
    if (typeof (window.localStorage as Storage & { clear?: unknown }).clear === "function") {
      window.localStorage.clear();
    }
    if (typeof (window.sessionStorage as Storage & { clear?: unknown }).clear === "function") {
      window.sessionStorage.clear();
    }
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

  it("month view starts on the first day of the selected month", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );

    fireEvent.change(screen.getByLabelText("Calendar jump date"), { target: { value: "2026-04-15" } });
    await user.click(screen.getByRole("button", { name: "Month" }));
    expect(screen.getByTestId("calendar-date-cell-2026-04-01")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View agenda for April 1, 2026" })).toBeInTheDocument();
  });

  it("week view uses Monday-start ordering", () => {
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );
    const headers = within(screen.getByTestId("week-grid-layout")).getAllByText(/^[A-Za-z]{3}, \d{1,2}\/\d{1,2}$/);
    expect(headers[0]).toHaveTextContent("Mon, 5/18");
    expect(headers[6]).toHaveTextContent("Sun, 5/24");
  });

  it("Previous/Next respects active day, week, month, and agenda views", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );

    await user.click(screen.getByRole("button", { name: "Day" }));
    expect(screen.getByText("Thu, 5/21")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Fri, 5/22")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Week" }));
    expect(screen.getByText("Mon, 5/18")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByText("May 11 - May 17, 2026")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Agenda" }));
    expect(screen.getByText("May 11 - May 17, 2026")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("May 18 - May 24, 2026")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Month" }));
    expect(screen.getByTestId("calendar-date-cell-2026-05-01")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View agenda for May 1, 2026" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByTestId("calendar-date-cell-2026-06-01")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View agenda for June 1, 2026" })).toBeInTheDocument();
  }, 15000);

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
    expect(within(panel).getByLabelText("Session date")).toHaveValue("2026-05-18");

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

  it("keeps month cells at a consistent height and opens day agenda from overflow", async () => {
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

    const targetCell = screen.getByTestId("calendar-date-cell-2026-05-24");
    expect(targetCell.className).toContain("h-44");
    expect(screen.getByTestId("month-overflow-trigger")).toBeInTheDocument();

    await user.click(screen.getByTestId("month-overflow-trigger"));
    expect(screen.getByTestId("day-agenda-panel")).toBeInTheDocument();
    expect(screen.getByText("Overflow D")).toBeInTheDocument();
  }, 15000);

  it("clicking month date opens right-panel day agenda instead of switching to day view", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );

    await user.click(screen.getByRole("button", { name: "Month" }));
    await user.click(screen.getByRole("button", { name: "View agenda for May 21, 2026" }));

    expect(screen.getByTestId("day-agenda-panel")).toBeInTheDocument();
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
    await user.click(screen.getByRole("button", { name: "View agenda for May 21, 2026" }));
    await user.click(within(screen.getByTestId("day-agenda-panel")).getByRole("button", { name: "View Day" }));

    expect(screen.getByTestId("day-grid")).toBeInTheDocument();
    expect(screen.queryByTestId("day-agenda-panel")).not.toBeInTheDocument();
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

    const targetDate = screen.getByRole("button", { name: "View agenda for May 24, 2026" });
    const targetCell = targetDate.closest("[data-testid='calendar-date-cell-2026-05-24']");
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
    const agendaPanel = screen.getByTestId("day-agenda-panel");
    await user.click(within(agendaPanel).getByRole("button", { name: "Add Session" }));

    const panel = screen.getByLabelText("session-form-panel");
    expect(within(panel).getByLabelText("Session date")).toHaveValue("2026-05-24");
  }, 15000);

  it("supports keyboard activation on month date and +N more to open day agenda", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );
    await activateStaff(user);

    for (const [title, start, end] of [
      ["Keyboard A", "07:00", "08:00"],
      ["Keyboard B", "08:00", "09:00"],
      ["Keyboard C", "09:00", "10:00"],
      ["Keyboard D", "10:00", "11:00"]
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

    const dateButton = screen.getByRole("button", { name: "View agenda for May 24, 2026" });
    dateButton.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByTestId("day-agenda-panel")).toBeInTheDocument();

    await user.click(within(screen.getByTestId("day-agenda-panel")).getByRole("button", { name: "View Day" }));
    await user.click(screen.getByRole("button", { name: "Month" }));

    const moreButton = screen.getByRole("button", { name: "View 1 more session for May 24, 2026" });
    moreButton.focus();
    await user.keyboard(" ");
    expect(screen.getByTestId("day-agenda-panel")).toBeInTheDocument();
  }, 15000);

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

  it("supports attendance mode present/absent toggles", async () => {
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
    await user.click(screen.getByRole("button", { name: "Take Attendance" }));
    expect(screen.getByLabelText("attendance-mode")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Present" })[0]);
    expect(screen.getByRole("status")).toHaveTextContent(/Marked/i);
  });

  it("allows override registration for blocked eligibility when permission is available", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );
    await activateStaff(user, "1111");

    await user.click(screen.getByRole("button", { name: "Agenda" }));
    await user.click(screen.getAllByRole("button", { name: "Open" })[0]);
    await user.type(screen.getByLabelText("Session customer search"), "Alex Rivera");
    await user.click(screen.getByRole("button", { name: "Override & Register" }));
    expect(screen.getByRole("status")).toHaveTextContent(/override confirmed|waitlist/i);
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
    expect(screen.getByRole("status")).toHaveTextContent(/promoted/i);
    expect(screen.getByLabelText("session-activity-log")).toBeInTheDocument();
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
  }, 15000);

  it("persists selected month view after refresh", async () => {
    const storage = installStorageMock();
    const user = userEvent.setup();

    const first = render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );

    await user.click(screen.getByRole("button", { name: "Month" }));
    expect(screen.getByTestId("month-grid")).toBeInTheDocument();
    first.unmount();

    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );

    expect(screen.getByTestId("month-grid")).toBeInTheDocument();
    storage.restore();
  });

  it("drags a day/week session to a new hour and preserves duration after confirm", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );
    await activateStaff(user);

    await user.click(screen.getByRole("button", { name: "Week" }));
    const sessionButton = screen.getAllByRole("button", { name: /Morning Mobility Flow/i })[0];
    fireEvent.dragStart(sessionButton);

    const targetSlot = screen.getByText("9:00 AM").closest(".contents")?.querySelectorAll(".min-h-16")[0];
    if (!targetSlot) throw new Error("Expected week slot target");
    fireEvent.dragOver(targetSlot);
    fireEvent.drop(targetSlot);

    expect(screen.getByLabelText("move-session-confirmation")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm Move" }));

    await user.click(screen.getByRole("button", { name: "Agenda" }));
    expect(screen.getByText(/9:00 AM–9:50 AM|9:00 AM - 9:50 AM/i)).toBeInTheDocument();
  });

  it("cancel move keeps session in original slot", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );
    await activateStaff(user);
    await user.click(screen.getByRole("button", { name: "Week" }));

    const sessionButton = screen.getAllByRole("button", { name: /Morning Mobility Flow/i })[0];
    fireEvent.dragStart(sessionButton);
    const targetSlot = screen.getByText("10:00 AM").closest(".contents")?.querySelectorAll(".min-h-16")[0];
    if (!targetSlot) throw new Error("Expected week slot target");
    fireEvent.dragOver(targetSlot);
    fireEvent.drop(targetSlot);

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Agenda" }));
    expect(screen.getByText(/7:00 AM–7:50 AM|7:00 AM - 7:50 AM/i)).toBeInTheDocument();
  });

  it("drags a month session to a new date and preserves time", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );
    await activateStaff(user);
    await user.click(screen.getByRole("button", { name: "Month" }));

    const sessionButton = screen.getAllByRole("button", { name: /Morning Mobility Flow/i })[0];
    fireEvent.dragStart(sessionButton);
    const dropDate = screen
      .getByRole("button", { name: "View agenda for May 23, 2026" })
      .closest("[data-testid='calendar-date-cell-2026-05-23']");
    if (!dropDate) throw new Error("Expected month day cell target");
    fireEvent.dragOver(dropDate);
    fireEvent.drop(dropDate);

    await user.click(screen.getByRole("button", { name: "Confirm Move" }));
    await user.click(screen.getByRole("button", { name: "Agenda" }));
    expect(screen.getByText(/2026-05-23/i)).toBeInTheDocument();
    expect(screen.getByText(/7:00 AM–7:50 AM|7:00 AM - 7:50 AM/i)).toBeInTheDocument();
  });

  it("shows recurring scope prompt in move confirmation", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );
    await activateStaff(user);
    await user.click(screen.getByRole("button", { name: "Week" }));

    const sessionButton = screen.getAllByRole("button", { name: /Morning Mobility Flow/i })[0];
    fireEvent.dragStart(sessionButton);
    fireEvent.drop(screen.getByTestId("calendar-slot-2026-05-21-9"));

    expect(screen.getByText(/Apply move to:/i)).toBeInTheDocument();
    expect(screen.getByText(/This session only/i)).toBeInTheDocument();
    expect(screen.getByText(/This and future sessions/i)).toBeInTheDocument();
    expect(screen.getByText(/Entire series/i)).toBeInTheDocument();
  });

  it("shows conflict warning on drag move and requires override checkbox", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );
    await activateStaff(user);
    await user.click(screen.getByRole("button", { name: "Week" }));

    const sessionButton = screen.getAllByRole("button", { name: /Yoga Flow/i })[0];
    fireEvent.dragStart(sessionButton);
    fireEvent.drop(screen.getByTestId("calendar-slot-2026-05-21-7"));

    expect(screen.getByLabelText("move-conflict-warning")).toBeInTheDocument();
    const confirmButton = screen.getByRole("button", { name: "Confirm Move" }) as HTMLButtonElement;
    expect(confirmButton.disabled).toBe(true);
    await user.click(screen.getByLabelText(/Manager override:/i));
    expect(confirmButton.disabled).toBe(false);
  });

  it("exposes keyboard fallback move action in session detail", async () => {
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
    await user.click(screen.getByRole("button", { name: "Move Session" }));
    expect(screen.getByLabelText("session-form-panel")).toBeInTheDocument();
  });
});
