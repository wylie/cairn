import { render, screen } from "@testing-library/react";
import { within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import ProgramsPage from "@/app/(app)/programs/page";
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

describe("Programs page IA", () => {
  it("does not show add forms by default and opens Add Program on demand", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ProgramsPage />
      </TestProviders>
    );

    expect(screen.queryByLabelText("program-form-panel")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add Program" }));
    expect(screen.getByLabelText("program-form-panel")).toBeInTheDocument();
    expect(screen.getByLabelText("program-form-layout")).toBeInTheDocument();
  });

  it("surfaces quick actions for registrations and session creation", () => {
    render(
      <TestProviders>
        <TopBar />
        <ProgramsPage />
      </TestProviders>
    );

    expect(screen.getByRole("link", { name: "View Registrations" })).toHaveAttribute("href", "/registrations");
    expect(screen.getByRole("link", { name: "Create Session" })).toHaveAttribute("href", "/calendar");
  });

  it("Edit Program opens populated form", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ProgramsPage />
      </TestProviders>
    );

    await user.click(screen.getAllByRole("button", { name: "Edit Program" })[0]);
    expect(screen.getByLabelText("Program name")).toHaveValue("Morning Mobility Flow");
  });

  it("Add Instructor form is hidden by default and opens on demand", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ProgramsPage />
      </TestProviders>
    );

    expect(screen.queryByLabelText("instructor-form-panel")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add Instructor" }));
    expect(screen.getByLabelText("instructor-form-panel")).toBeInTheDocument();
    expect(screen.getByLabelText("instructor-form-layout")).toBeInTheDocument();
  });

  it("age range validates min and max", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ProgramsPage />
      </TestProviders>
    );

    await user.click(screen.getByRole("button", { name: "Add Program" }));
    await user.type(screen.getByLabelText("Program name"), "Youth Bouldering Basics");
    await user.type(screen.getByLabelText("Program minimum age"), "12");
    await user.type(screen.getByLabelText("Program maximum age"), "8");
    await user.click(screen.getByRole("button", { name: "Create Program" }));

    expect(screen.getByText("Maximum age must be greater than or equal to minimum age.")).toBeInTheDocument();
  });

  it("age range display formats correctly", () => {
    render(
      <TestProviders>
        <TopBar />
        <ProgramsPage />
      </TestProviders>
    );

    expect(screen.getByText(/Ages 8-14/i)).toBeInTheDocument();
    expect(screen.getAllByText(/All ages/i).length).toBeGreaterThan(0);
  });

  it("registration panel no longer appears on Programs page", () => {
    render(
      <TestProviders>
        <TopBar />
        <ProgramsPage />
      </TestProviders>
    );

    expect(screen.queryByRole("heading", { name: "Registrations" })).not.toBeInTheDocument();
  });

  it("registration appears in Calendar session detail", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );

    await user.click(screen.getByRole("button", { name: "Agenda" }));
    await user.click(screen.getAllByRole("button", { name: "Open" })[0]);
    expect(screen.getByText("Registered roster")).toBeInTheDocument();
  });

  it("creating session uses program default capacity and allows override", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    await user.click(screen.getAllByRole("button", { name: "Create Session" })[0]);
    expect(screen.getByLabelText("Session capacity")).toHaveValue("12");

    await user.selectOptions(screen.getByLabelText("Session program"), "prog_202");
    expect(screen.getByLabelText("Session capacity")).toHaveValue("24");

    await user.clear(screen.getByLabelText("Session capacity"));
    await user.type(screen.getByLabelText("Session capacity"), "30");
    expect(screen.getByLabelText("Session capacity")).toHaveValue("30");
  });

  it("instructor list persists after refresh", async () => {
    const storage = installStorageMock();
    const user = userEvent.setup();

    const first = render(
      <TestProviders>
        <TopBar />
        <ProgramsPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    await user.click(screen.getByRole("button", { name: "Add Instructor" }));
    await user.type(screen.getByLabelText("Instructor first name"), "Jamie");
    await user.type(screen.getByLabelText("Instructor last name"), "Park");
    await user.click(screen.getByRole("button", { name: "Create Instructor" }));
    expect(screen.getByText(/Instructor added: Jamie Park/i)).toBeInTheDocument();

    first.unmount();

    render(
      <TestProviders>
        <TopBar />
        <ProgramsPage />
      </TestProviders>
    );

    expect(screen.getByText("Jamie Park")).toBeInTheDocument();
    storage.restore();
  });

  it("inactive programs do not appear in create session by default", async () => {
    const storage = installStorageMock();
    const user = userEvent.setup();
    const first = render(
      <TestProviders>
        <TopBar />
        <ProgramsPage />
      </TestProviders>
    );

    await user.click(screen.getAllByRole("button", { name: "Edit Program" })[0]);
    const toggle = screen.getByLabelText("Program active");
    if ((toggle as HTMLInputElement).checked) {
      await user.click(toggle);
    }
    await user.click(screen.getByRole("button", { name: "Save Program" }));
    first.unmount();

    render(
      <TestProviders>
        <TopBar />
        <CalendarPage />
      </TestProviders>
    );

    await activateStaff(user, "2222");
    await user.click(screen.getAllByRole("button", { name: "Create Session" })[0]);

    const select = screen.getByLabelText("Session program");
    expect(within(select).queryByRole("option", { name: "Morning Mobility Flow" })).not.toBeInTheDocument();
    storage.restore();
  });
});
