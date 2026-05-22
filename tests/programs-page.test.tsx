import { render, screen } from "@testing-library/react";
import { within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import ProgramsPage from "@/app/(app)/programs/page";
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

describe("Programs page foundation", () => {
  it("renders programs, sessions, and registrations sections", () => {
    render(
      <TestProviders>
        <TopBar />
        <ProgramsPage />
      </TestProviders>
    );

    expect(screen.getByRole("heading", { name: "Programs" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Program Catalog" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sessions" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Registrations" })).toBeInTheDocument();
  });

  it("can create a session for a program", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ProgramsPage />
      </TestProviders>
    );

    await user.selectOptions(screen.getByLabelText("Program for new session"), "prog_101");
    await user.type(screen.getByLabelText("Session start"), "2026-06-20T09:00");
    await user.type(screen.getByLabelText("Session end"), "2026-06-20T10:00");
    await user.clear(screen.getByLabelText("Session capacity"));
    await user.type(screen.getByLabelText("Session capacity"), "16");
    await user.click(screen.getByRole("button", { name: "Create Session" }));

    expect(screen.getByText(/Session created for Morning Mobility Flow/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Jun 20, 2026/i).length).toBeGreaterThan(0);
  });

  it("can register a customer to a session", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ProgramsPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    await user.type(screen.getByLabelText("Register session search"), "Morning");
    await user.keyboard("{ArrowDown}{Enter}");
    await user.type(screen.getByLabelText("Register customer search"), "Alex");
    await user.keyboard("{ArrowDown}{Enter}");
    await user.click(screen.getByRole("button", { name: "Register" }));

    expect(screen.getByText(/Registration confirmed for Alex Rivera/i)).toBeInTheDocument();
    expect(screen.getByText(/Alex Rivera • Morning Mobility Flow/i)).toBeInTheDocument();
  });

  it("persists sessions and registrations after refresh", async () => {
    const storage = installStorageMock();
    const user = userEvent.setup();

    const first = render(
      <TestProviders>
        <TopBar />
        <ProgramsPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    await user.selectOptions(screen.getByLabelText("Program for new session"), "prog_101");
    await user.type(screen.getByLabelText("Session start"), "2026-06-22T09:00");
    await user.type(screen.getByLabelText("Session end"), "2026-06-22T10:00");
    await user.clear(screen.getByLabelText("Session capacity"));
    await user.type(screen.getByLabelText("Session capacity"), "10");
    await user.click(screen.getByRole("button", { name: "Create Session" }));

    await user.type(screen.getByLabelText("Register session search"), "Jun 22");
    await user.keyboard("{ArrowDown}{Enter}");
    await user.type(screen.getByLabelText("Register customer search"), "Maya");
    await user.keyboard("{ArrowDown}{Enter}");
    await user.click(screen.getByRole("button", { name: "Register" }));

    first.unmount();

    render(
      <TestProviders>
        <TopBar />
        <ProgramsPage />
      </TestProviders>
    );

    expect(screen.getByText(/Maya Patel • Morning Mobility Flow/i)).toBeInTheDocument();
    storage.restore();
  });

  it("customer dropdown no longer renders and searchable picker is used", () => {
    render(
      <TestProviders>
        <TopBar />
        <ProgramsPage />
      </TestProviders>
    );

    expect(screen.getByLabelText("Register customer search")).toBeInTheDocument();
    expect(screen.queryByLabelText("Register customer")).not.toBeInTheDocument();
  });

  it("search filters customers and no-results state appears", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ProgramsPage />
      </TestProviders>
    );

    const input = screen.getByLabelText("Register customer search");
    await user.type(input, "Maya");
    expect(screen.getByRole("option", { name: /Maya Patel/i })).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, "zzzzzz");
    expect(screen.getByText("No customers found")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Customer" })).toBeInTheDocument();
  });

  it("keyboard navigation selects highlighted customer and supports clear", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ProgramsPage />
      </TestProviders>
    );

    const input = screen.getByLabelText("Register customer search");
    await user.type(input, "Alex");
    await user.keyboard("{ArrowDown}{Enter}");

    expect(screen.getByLabelText("Selected registration customer")).toHaveTextContent("Alex Rivera");
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.queryByLabelText("Selected registration customer")).not.toBeInTheDocument();
  });

  it("register button is disabled without selected customer", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ProgramsPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    await user.type(screen.getByLabelText("Register session search"), "Morning");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(screen.getByRole("button", { name: "Register" })).toBeDisabled();
  });

  it("add customer option can create and select a new customer", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <ProgramsPage />
      </TestProviders>
    );

    await user.type(screen.getByLabelText("Register customer search"), "no-match-value");
    await user.click(screen.getByRole("button", { name: "Add Customer" }));
    await user.type(screen.getByLabelText("First name"), "Rae");
    await user.type(screen.getByLabelText("Last name"), "Quick");
    await user.click(screen.getByRole("button", { name: "Create Customer" }));

    expect(screen.getByLabelText("Selected registration customer")).toHaveTextContent("Rae Quick");
  });

  it("session dropdown no longer renders and searchable session picker is used", () => {
    render(
      <TestProviders>
        <TopBar />
        <ProgramsPage />
      </TestProviders>
    );

    expect(screen.getByLabelText("Register session search")).toBeInTheDocument();
    expect(screen.queryByLabelText("Register customer session")).not.toBeInTheDocument();
  });

  it("session search filters and shows no-results state", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ProgramsPage />
      </TestProviders>
    );

    const input = screen.getByLabelText("Register session search");
    await user.type(input, "Mobility");
    const results = screen.getByRole("listbox", { name: "Session search results" });
    expect(within(results).getByRole("option", { name: /Morning Mobility Flow/i })).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, "zzzzzz");
    expect(screen.getByText("No sessions found")).toBeInTheDocument();
  });

  it("session keyboard navigation selects highlighted session and supports clear", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ProgramsPage />
      </TestProviders>
    );

    const input = screen.getByLabelText("Register session search");
    await user.type(input, "Morning");
    await user.keyboard("{ArrowDown}{Enter}");

    const selectedSession = screen.getByLabelText("Selected registration session");
    expect(selectedSession).toHaveTextContent("Morning Mobility Flow");
    await user.click(within(selectedSession).getByRole("button", { name: "Clear" }));
    expect(screen.queryByLabelText("Selected registration session")).not.toBeInTheDocument();
  });

  it("register button is disabled without selected session", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <ProgramsPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    await user.type(screen.getByLabelText("Register customer search"), "Alex");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(screen.getByRole("button", { name: "Register" })).toBeDisabled();
  });
});
