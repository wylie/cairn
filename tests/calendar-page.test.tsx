import { render, screen } from "@testing-library/react";
import { within } from "@testing-library/react";
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

describe("Calendar schedule foundation", () => {
  it("filter inputs align in shared toolbar", () => {
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );

    const toolbar = screen.getByLabelText("schedule-filter-toolbar");
    expect(toolbar).toBeInTheDocument();
    expect(screen.getAllByText("Search").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Search")).toHaveClass("h-11");
    expect(screen.getByLabelText("Schedule date")).toHaveClass("h-11");
    expect(screen.getByLabelText("Filter location")).toHaveClass("h-11");
    expect(screen.getByLabelText("Filter category")).toHaveClass("h-11");
    expect(screen.getByLabelText("Filter instructor")).toHaveClass("h-11");
    expect(screen.getByLabelText("Filter status")).toHaveClass("h-11");
    expect(screen.getByTestId("schedule-filter-grid").className).toContain("[grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]");
    expect(screen.getByTestId("schedule-filter-grid").className).not.toContain("xl:grid-cols-[");
    expect(toolbar.querySelectorAll(".schedule-filter-field")).toHaveLength(6);
  });

  it("renders schedule and week view by default", () => {
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );

    expect(screen.getByRole("heading", { name: "Schedule" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Week" })).toHaveAttribute("aria-selected", "true");
  });

  it("toggles day/week/agenda views", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );

    await user.click(screen.getByRole("tab", { name: "Day" }));
    expect(screen.getByRole("tab", { name: "Day" })).toHaveAttribute("aria-selected", "true");

    await user.click(screen.getByRole("tab", { name: "Agenda" }));
    expect(screen.getByRole("tab", { name: "Agenda" })).toHaveAttribute("aria-selected", "true");
  });

  it("filters sessions and supports search", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );

    await user.selectOptions(screen.getByLabelText("Filter location"), "loc_002");
    await user.clear(screen.getByLabelText("Schedule date"));
    await user.type(screen.getByLabelText("Schedule date"), "2026-06-15");
    expect(screen.getAllByText(/Youth Adventure Camp/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Morning Mobility Flow/i)).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Filter location"), "all");
    await user.type(screen.getByLabelText("Search"), "Iris");
    expect(screen.getAllByText(/Youth Adventure Camp/i).length).toBeGreaterThan(0);
  });

  it("creates a session with active staff", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );
    await activateStaff(user);

    await user.click(screen.getAllByRole("button", { name: "Create Session" })[0]);
    const createPanel = screen.getByLabelText("session-form-panel");
    expect(within(createPanel).getByLabelText("session-form-layout")).toBeInTheDocument();
    expect(within(createPanel).getByLabelText("Session waitlist enabled")).toBeInTheDocument();
    await user.type(within(createPanel).getByLabelText("Session title"), "Evening Strength Lab");
    await user.selectOptions(within(createPanel).getByLabelText("Session program"), "prog_101");
    await user.type(within(createPanel).getByLabelText("Session date"), "2026-05-22");
    await user.type(within(createPanel).getByLabelText("Session start time"), "18:00");
    await user.type(within(createPanel).getByLabelText("Session end time"), "19:00");
    await user.clear(within(createPanel).getByLabelText("Session capacity"));
    await user.type(within(createPanel).getByLabelText("Session capacity"), "12");
    await user.click(within(createPanel).getByRole("button", { name: "Create Session" }));

    expect(screen.getByText(/Session created\./i)).toBeInTheDocument();
    expect(screen.getByText(/Evening Strength Lab/i)).toBeInTheDocument();
  });

  it("session card actions render inside each card", () => {
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );

    const firstCard = screen.getByLabelText("session-card-sess_001");
    expect(within(firstCard).getByRole("button", { name: "View Details" })).toBeInTheDocument();
    expect(within(firstCard).getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("validates start and end times", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );
    await activateStaff(user);

    await user.click(screen.getAllByRole("button", { name: "Create Session" })[0]);
    const createPanel = screen.getByLabelText("session-form-panel");
    await user.type(within(createPanel).getByLabelText("Session title"), "Invalid Session");
    await user.selectOptions(within(createPanel).getByLabelText("Session program"), "prog_101");
    await user.type(within(createPanel).getByLabelText("Session date"), "2026-05-22");
    await user.type(within(createPanel).getByLabelText("Session start time"), "19:00");
    await user.type(within(createPanel).getByLabelText("Session end time"), "18:00");
    await user.click(within(createPanel).getByRole("button", { name: "Create Session" }));

    expect(screen.getAllByText(/Session end must be after start/i).length).toBeGreaterThan(0);
  });

  it("edits and cancels a session", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );
    await activateStaff(user);

    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    await user.clear(screen.getByLabelText("Session capacity"));
    await user.type(screen.getByLabelText("Session capacity"), "30");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(screen.getByText("Session updated.")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    await user.click(screen.getByRole("button", { name: "Cancel Session" }));
    expect(screen.getAllByText(/cancelled/i).length).toBeGreaterThan(0);
  });

  it("edit opens correct data for different sessions and switching updates panel", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );
    await activateStaff(user);

    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    expect(screen.getByLabelText("Session title")).toHaveValue("Morning Mobility Flow");

    await user.selectOptions(screen.getByLabelText("Filter location"), "loc_002");
    await user.clear(screen.getByLabelText("Schedule date"));
    await user.type(screen.getByLabelText("Schedule date"), "2026-06-15");
    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    expect(screen.getByLabelText("Session title")).toHaveValue("Youth Adventure Camp - Day 1");
  });

  it("save updates only the targeted session", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );
    await activateStaff(user);

    await user.selectOptions(screen.getByLabelText("Filter location"), "loc_002");
    await user.clear(screen.getByLabelText("Schedule date"));
    await user.type(screen.getByLabelText("Schedule date"), "2026-06-15");
    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    await user.clear(screen.getByLabelText("Session title"));
    await user.type(screen.getByLabelText("Session title"), "Youth Camp Updated");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(screen.getByText(/Youth Camp Updated/i)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Filter location"), "loc_001");
    await user.clear(screen.getByLabelText("Schedule date"));
    await user.type(screen.getByLabelText("Schedule date"), "2026-05-21");
    expect(screen.getAllByText(/Morning Mobility Flow/i).length).toBeGreaterThan(0);
  });

  it("session form shows active instructors and excludes inactive ones", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );
    await activateStaff(user);

    await user.click(screen.getAllByRole("button", { name: "Create Session" })[0]);
    const select = screen.getByLabelText("Session instructor");
    expect(within(select).getByRole("option", { name: "Iris Chen" })).toBeInTheDocument();
    expect(within(select).queryByRole("option", { name: "Nora Vale" })).not.toBeInTheDocument();
  });

  it("session create defaults populate from selected Program", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );
    await activateStaff(user);

    await user.click(screen.getAllByRole("button", { name: "Create Session" })[0]);
    expect(screen.getByLabelText("Session capacity")).toHaveValue("12");
    expect(screen.getByLabelText("Session location")).toHaveValue("loc_001");
    await user.selectOptions(screen.getByLabelText("Session program"), "prog_202");
    expect(screen.getByLabelText("Session capacity")).toHaveValue("24");
  });

  it("updates registration counts from session detail", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );
    await activateStaff(user);

    await user.click(screen.getAllByRole("button", { name: "View Details" })[0]);
    await user.type(screen.getByLabelText("Session customer search"), "Alex");
    await user.keyboard("{ArrowDown}{Enter}");

    expect(screen.getByText(/Registration confirmed for Alex Rivera/i)).toBeInTheDocument();
    expect(screen.getByText(/15 \/ 20 registered/i)).toBeInTheDocument();
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

    await user.click(screen.getAllByRole("button", { name: "Create Session" })[0]);
    const createPanel = screen.getByLabelText("session-form-panel");
    await user.type(within(createPanel).getByLabelText("Session title"), "Persisted Session");
    await user.selectOptions(within(createPanel).getByLabelText("Session program"), "prog_101");
    await user.type(within(createPanel).getByLabelText("Session date"), "2026-05-23");
    await user.type(within(createPanel).getByLabelText("Session start time"), "08:00");
    await user.type(within(createPanel).getByLabelText("Session end time"), "09:00");
    await user.click(within(createPanel).getByRole("button", { name: "Create Session" }));

    first.unmount();

    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );

    expect(screen.getByText(/Persisted Session/i)).toBeInTheDocument();
    storage.restore();
  });
});
