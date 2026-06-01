import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopBar } from "@/components/layout/top-bar";
import RegistrationsPage from "@/app/(app)/registrations/page";
import { TestProviders } from "@/tests/test-providers";

async function activateStaff(user: ReturnType<typeof userEvent.setup>, pin = "2222") {
  await user.click(screen.getAllByRole("button", { name: "Switch" })[0]);
  await user.type(screen.getByLabelText("Staff PIN input"), pin);
  await user.click(screen.getByRole("button", { name: "Confirm" }));
}

describe("Registrations workstation", () => {
  it("renders three-column registration workflow", () => {
    render(
      <TestProviders>
        <TopBar />
        <RegistrationsPage />
      </TestProviders>
    );

    expect(screen.getByTestId("registrations-workstation")).toBeInTheDocument();
    expect(screen.getByLabelText("session-search-panel")).toBeInTheDocument();
    expect(screen.getByLabelText("session-details-panel")).toBeInTheDocument();
    expect(screen.getByLabelText("customer-enrollment-panel")).toBeInTheDocument();
  });

  it("creates a registration and records audit metadata", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <RegistrationsPage />
      </TestProviders>
    );

    await activateStaff(user, "2222");
    await user.type(screen.getByPlaceholderText("Name, email, phone, member ID"), "Maya Patel");
    await user.click(screen.getAllByRole("button", { name: "Register" })[0]);

    expect(screen.getByRole("status")).toHaveTextContent(/Registration confirmed|added to waitlist|override confirmed/i);
    expect(screen.getByText("Registration activity")).toBeInTheDocument();
    expect(screen.getAllByText(/front_desk/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Maya Lopez/i).length).toBeGreaterThan(0);
  });

  it("routes new registrations to waitlist when session is full", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <RegistrationsPage />
      </TestProviders>
    );

    await activateStaff(user, "2222");
    await user.clear(screen.getByLabelText("Date to"));
    await user.type(screen.getByLabelText("Date to"), "2026-06-30");
    const fullSession = screen.getByRole("button", { name: /Summer Adventure Camp/i });
    await user.click(fullSession);

    await user.type(screen.getByPlaceholderText("Name, email, phone, member ID"), "Maya Patel");
    await user.click(screen.getByRole("button", { name: "Override & Register" }));

    expect(screen.getByRole("status")).toHaveTextContent(/waitlist/i);
    expect(screen.getByText("Waitlist")).toBeInTheDocument();
  });

  it("promotes from waitlist from session roster controls", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <RegistrationsPage />
      </TestProviders>
    );

    await activateStaff(user, "2222");

    await user.clear(screen.getByLabelText("Date to"));
    await user.type(screen.getByLabelText("Date to"), "2026-06-30");
    const moveButtons = screen.getAllByRole("button", { name: "Move to waitlist" });
    await user.click(moveButtons[0]);
    expect(screen.getByRole("status")).toHaveTextContent(/moved to waitlist/i);

    const promoteButtons = screen.getAllByRole("button", { name: "Promote from waitlist" });
    await user.click(promoteButtons[0]);
    expect(screen.getByRole("status")).toHaveTextContent(/promoted/i);
  });

  it("shows eligibility reasons and override option", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <RegistrationsPage />
      </TestProviders>
    );

    await activateStaff(user, "2222");
    await user.selectOptions(screen.getByLabelText("Program"), "prog_202");
    await user.type(screen.getByPlaceholderText("Name, email, phone, member ID"), "Maya Patel");

    expect(screen.getByText(/Age Restriction|Needs Waiver|Membership Required|Blocked/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Override & Register" })).toBeInTheDocument();
  });

  it("supports transfer, duplicate, and staff note actions", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <RegistrationsPage />
      </TestProviders>
    );

    await activateStaff(user, "2222");
    await user.clear(screen.getByLabelText("Date to"));
    await user.type(screen.getByLabelText("Date to"), "2026-06-30");

    const moveSelect = screen.getAllByRole("combobox").find((node) =>
      Array.from(node.querySelectorAll("option")).some((option) => option.textContent?.includes("Move to another session"))
    );
    expect(moveSelect).toBeTruthy();
    if (!moveSelect) return;
    await user.selectOptions(moveSelect, "sess_002");
    await user.click(screen.getAllByRole("button", { name: "Transfer" })[0]);
    expect(screen.getByRole("status")).toHaveTextContent(/transferred/i);

    await user.click(screen.getAllByRole("button", { name: "Duplicate" })[0]);
    expect(screen.getByRole("status")).toHaveTextContent(/duplicated|already registered|waitlist|confirmed/i);

    const noteField = screen.getByPlaceholderText("Add staff note");
    await user.type(noteField, "Needs parent follow-up");
    await user.click(screen.getAllByRole("button", { name: "Add Note" })[0]);
    expect(screen.getByRole("status")).toHaveTextContent(/note added/i);
  });

  it("supports waitlist reordering controls", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <RegistrationsPage />
      </TestProviders>
    );

    await activateStaff(user, "2222");
    await user.clear(screen.getByLabelText("Date to"));
    await user.type(screen.getByLabelText("Date to"), "2026-06-30");
    await user.click(screen.getByRole("button", { name: /Summer Adventure Camp/i }));
    await user.click(screen.getByRole("button", { name: "Move down" }));
    expect(screen.getByRole("status")).toHaveTextContent(/waitlist order updated|cannot move further/i);
  });
});
