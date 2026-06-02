import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StaffPage from "@/app/(app)/staff/page";
import StaffDetailPage from "@/app/(app)/staff/[id]/page";
import { TestProviders } from "@/tests/test-providers";
import { TopBar } from "@/components/layout/top-bar";
import { AppShell } from "@/components/layout/app-shell";
import { vi } from "vitest";
import { CustomerDetailView } from "@/components/customers/customer-detail-view";

let mockSearchParams = "";
vi.mock("next/navigation", () => ({
  usePathname: () => "/staff",
  useParams: () => ({ id: "cust_staff_002" }),
  useSearchParams: () => new URLSearchParams(mockSearchParams),
  useRouter: () => ({ replace: vi.fn() })
}));

async function switchStaff(user: ReturnType<typeof userEvent.setup>, pin: string) {
  await user.click(screen.getAllByRole("button", { name: "Switch" })[0]);
  await user.type(screen.getByLabelText("Staff PIN input"), pin);
  await user.click(screen.getByRole("button", { name: "Confirm" }));
}

describe("Staff management MVP", () => {
  beforeEach(() => {
    mockSearchParams = "";
  });

  it("shows staff nav for manager and hides it for instructor", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <AppShell>
          <div>content</div>
        </AppShell>
      </TestProviders>
    );
    await switchStaff(user, "2222");
    expect(screen.getByRole("link", { name: "Staff" })).toBeInTheDocument();

    await switchStaff(user, "4444");
    expect(screen.queryByRole("link", { name: "Staff" })).not.toBeInTheDocument();
  });

  it("renders staff list and filters by role", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <StaffPage />
      </TestProviders>
    );
    await switchStaff(user, "2222");
    expect(screen.getByText("Maya Lopez")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Role"), "instructor");
    expect(screen.getByText("Jordan Kim")).toBeInTheDocument();
    expect(screen.queryByText("Sam Rivera")).not.toBeInTheDocument();
  });

  it("renders staff avatars in list cards", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <StaffPage />
      </TestProviders>
    );
    await switchStaff(user, "2222");
    expect(screen.getByLabelText(/Maya Lopez staff initials avatar|Maya Lopez staff photo/i)).toBeInTheDocument();
  });

  it("supports adding staff and shows feedback", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <StaffPage />
      </TestProviders>
    );
    await switchStaff(user, "1111");
    const initialProfiles = screen.getAllByRole("link", { name: "View Profile" }).length;
    await user.click(screen.getByRole("button", { name: "Add Staff" }));
    const dialog = screen.getByRole("dialog", { name: "Add Staff" });
    await user.click(within(dialog).getByRole("button", { name: "Create New Person" }));
    await user.type(within(dialog).getByLabelText("First name"), "Avery");
    await user.type(within(dialog).getByLabelText("Last name"), "Lane");
    await user.type(within(dialog).getByLabelText("Email"), "avery.lane@example.com");
    await user.click(within(dialog).getByRole("button", { name: "Add Staff" }));
    await waitFor(() =>
      expect(screen.getAllByRole("link", { name: "View Profile" }).length).toBeGreaterThan(initialProfiles)
    );
  });

  it("staff list cards show View Profile only and hide suspend action", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <StaffPage />
      </TestProviders>
    );
    await switchStaff(user, "1111");
    expect(screen.getAllByRole("link", { name: "View Profile" }).length).toBeGreaterThan(0);
    const firstProfileLink = screen.getAllByRole("link", { name: "View Profile" })[0];
    expect(firstProfileLink).toHaveAttribute("href", expect.stringContaining("/customers/"));
    expect(screen.queryByRole("button", { name: /Suspend/i })).not.toBeInTheDocument();
  });

  it("staff detail route redirects to customer profile flow", async () => {
    render(
      <TestProviders>
        <StaffDetailPage />
      </TestProviders>
    );
    expect(screen.getByText(/Redirecting to customer profile/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open customer profile/i })).toBeInTheDocument();
  });

  it("staff profile section appears only for staff customers", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CustomerDetailView customerId="cust_staff_002" />
      </TestProviders>
    );
    await switchStaff(user, "1111");
    expect(screen.getByRole("link", { name: "Staff Profile" })).toBeInTheDocument();
  });

  it("suspend staff uses custom confirmation modal", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CustomerDetailView customerId="cust_staff_002" />
      </TestProviders>
    );
    await switchStaff(user, "1111");
    const staffProfileTab = screen.getByRole("link", { name: "Staff Profile" });
    await user.click(staffProfileTab);
    await user.click(screen.getByRole("button", { name: "Suspend Staff" }));
    expect(screen.getByRole("dialog", { name: "Suspend staff confirmation" })).toBeInTheDocument();
    expect(screen.queryByText(/window\.confirm/i)).not.toBeInTheDocument();
  });

  it("staff profile displays human-friendly permission labels and hides raw keys", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CustomerDetailView customerId="cust_staff_002" />
      </TestProviders>
    );
    await switchStaff(user, "1111");
    await user.click(screen.getByRole("link", { name: "Staff Profile" }));
    expect(screen.getByText(/Manage staff/i)).toBeInTheDocument();
    expect(screen.getByText(/View reports/i)).toBeInTheDocument();
    expect(screen.queryByText(/manageStaff/)).not.toBeInTheDocument();
    expect(screen.queryByText(/viewReports/)).not.toBeInTheDocument();
  });

  it("staff profile explains password vs staff PIN usage", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <CustomerDetailView customerId="cust_staff_002" />
      </TestProviders>
    );
    await switchStaff(user, "1111");
    await user.click(screen.getByRole("link", { name: "Staff Profile" }));
    expect(
      screen.getByText(/Login password is used to sign into Cairn. Staff PIN is used for quick workstation switching and manager approval./i)
    ).toBeInTheDocument();
  });

  it("editing staff profile does not mutate current user navigation before save", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <AppShell>
          <CustomerDetailView customerId="cust_staff_002" />
        </AppShell>
      </TestProviders>
    );
    await switchStaff(user, "1111");
    expect(screen.getByRole("link", { name: "Customers" })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Staff Profile" }));
    await user.click(screen.getByRole("button", { name: "Edit Staff Profile" }));
    const dialog = screen.getByRole("dialog", { name: "Edit staff profile" });
    await user.selectOptions(within(dialog).getByLabelText("Role"), "front_desk");
    expect(screen.getByRole("link", { name: "Customers" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog", { name: "Edit staff profile" })).not.toBeInTheDocument();
  });

  it("role management placeholder renders", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <StaffPage />
      </TestProviders>
    );
    await switchStaff(user, "1111");
    expect(screen.getByRole("heading", { name: "Role Management" })).toBeInTheDocument();
    expect(screen.getByText(/Custom roles coming later/i)).toBeInTheDocument();
  });

  it("add staff modal closes on Escape and outside click but not inside click", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <StaffPage />
      </TestProviders>
    );
    await switchStaff(user, "1111");

    await user.click(screen.getByRole("button", { name: "Add Staff" }));
    expect(screen.getByRole("dialog", { name: "Add Staff" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Add Staff" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add Staff" }));
    const dialog = screen.getByRole("dialog", { name: "Add Staff" });
    await user.click(within(dialog).getByRole("button", { name: "Create New Person" }));
    expect(screen.getByRole("dialog", { name: "Add Staff" })).toBeInTheDocument();
    await user.click(within(dialog).getByLabelText("First name"));
    expect(screen.getByRole("dialog", { name: "Add Staff" })).toBeInTheDocument();
    await user.click(dialog);
    expect(screen.queryByRole("dialog", { name: "Add Staff" })).not.toBeInTheDocument();
  });
});
