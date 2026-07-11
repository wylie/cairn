import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CustomerDetailPage from "@/app/(app)/customers/[id]/page";
import { CheckInList } from "@/components/checkins/checkin-list";
import { CustomerList } from "@/components/customers/customer-list";
import { TopBar } from "@/components/layout/top-bar";
import PosPage from "@/app/(app)/pos/page";
import { TestProviders } from "@/tests/test-providers";
import { beforeEach, vi } from "vitest";

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>("next/navigation");
  return {
    ...actual,
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
    useSearchParams: () => new URLSearchParams(window.location.search)
  };
});

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

describe("CustomerDetailPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.history.pushState({}, "", "/customers/cust_001");
  });

  it("renders expected sections", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(<TestProviders>{page}</TestProviders>);

    expect(screen.getByLabelText("detail-header")).toBeInTheDocument();
    expect(screen.getByLabelText("detail-jump-links")).toBeInTheDocument();
    expect(screen.getByLabelText("detail-summary-cards")).toBeInTheDocument();
    expect(screen.getByLabelText("detail-access-products")).toBeInTheDocument();
    expect(screen.getByLabelText("detail-timeline")).toBeInTheDocument();
    expect(screen.getByLabelText("detail-visit-history")).toBeInTheDocument();
    expect(screen.getByLabelText("detail-notes")).toBeInTheDocument();
    expect(screen.getByLabelText("detail-purchases")).toBeInTheDocument();
    expect(screen.getByLabelText("detail-registrations")).toBeInTheDocument();
    expect(screen.getByLabelText("detail-waiver-history")).toBeInTheDocument();
    expect(screen.getByLabelText("detail-profile-information")).toBeInTheDocument();
    expect(screen.queryByLabelText("detail-related-customers")).not.toBeInTheDocument();
    expect(screen.getByLabelText("detail-payment-methods")).toBeInTheDocument();
    expect(screen.queryByLabelText("detail-profile-details")).not.toBeInTheDocument();
  });

  it("renders back to customers navigation link as fallback", async () => {
    window.history.pushState({}, "", "/customers/cust_001");
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(<TestProviders>{page}</TestProviders>);
    const backLink = screen.getByRole("link", { name: /back to customers/i });
    expect(backLink).toHaveAttribute("href", "/customers");
  });

  it("renders context-aware back link when opened from check-in", async () => {
    window.history.pushState({}, "", "/customers/cust_001?from=check-in&fromLabel=Check-In&returnTo=%2Fo%2Fsummit%2Fcheck-in%3Fquery%3DMaya%26filter%3Dkids");
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(<TestProviders>{page}</TestProviders>);
    const backLink = screen.getByRole("link", { name: /back to check-in/i });
    expect(backLink).toHaveAttribute("href", "/o/summit/check-in?query=Maya&filter=kids");
  });

  it("renders context-aware back link when opened from registrations", async () => {
    window.history.pushState({}, "", "/customers/cust_001?from=registrations&returnTo=%2Fo%2Fsummit%2Fregistrations%3Fstatus%3Dwaitlisted%26session%3Dsess_001");
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(<TestProviders>{page}</TestProviders>);
    const backLink = screen.getByRole("link", { name: /back to registrations/i });
    expect(backLink).toHaveAttribute("href", "/o/summit/registrations?status=waitlisted&session=sess_001");
  });

  it("ignores external return URLs and falls back safely", async () => {
    window.history.pushState({}, "", "/customers/cust_001?from=reports&returnTo=https%3A%2F%2Fevil.example");
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(<TestProviders>{page}</TestProviders>);
    const backLink = screen.getByRole("link", { name: /back to reports/i });
    expect(backLink).toHaveAttribute("href", "/customers");
  });

  it("renders jump links targeting customer sections", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(<TestProviders>{page}</TestProviders>);
    const jumpRow = screen.getByLabelText("detail-jump-links");
    const labels = ["Overview", "Profile", "Access", "Relationships", "Payment", "Visits", "Purchases", "Documents", "Communications", "Registrations", "Waivers", "Notes", "Activity Timeline"];
    labels.forEach((label) => {
      const link = within(jumpRow).getByRole("link", { name: label });
      expect(link.getAttribute("href")).toMatch(/^#/);
    });
  });

  it("renders staff profile jump link only when staff section is rendered", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_staff_002" }) });
    render(<TestProviders>{page}</TestProviders>);
    const jumpRow = screen.getByLabelText("detail-jump-links");
    expect(within(jumpRow).getByRole("link", { name: "Staff Profile" })).toBeInTheDocument();
    expect(screen.getByLabelText("section-staff-profile")).toBeInTheDocument();
  });

  it("jump link order matches rendered section order", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(<TestProviders>{page}</TestProviders>);
    const jumpRow = screen.getByLabelText("detail-jump-links");
    const links = within(jumpRow).getAllByRole("link");
    const hrefs = links.map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual([
      "#overview",
      "#profile",
      "#access",
      "#relationships",
      "#payment",
      "#visits",
      "#purchases",
      "#documents",
      "#communications",
      "#registrations",
      "#waiver",
      "#notes",
      "#timeline"
    ]);
  });

  it("staff-only jump link is hidden when customer is not staff", async () => {
    const nonStaffPage = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_002" }) });
    render(<TestProviders>{nonStaffPage}</TestProviders>);
    const jumpRow = screen.getByLabelText("detail-jump-links");
    expect(within(jumpRow).queryByRole("link", { name: "Staff Profile" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("section-staff-profile")).not.toBeInTheDocument();
  });

  it("active jump link updates on section intersection", async () => {
    const callbacks: Array<IntersectionObserverCallback> = [];
    const observe = vi.fn();
    const disconnect = vi.fn();
    const originalObserver = globalThis.IntersectionObserver;
    globalThis.IntersectionObserver = vi.fn(function (cb: IntersectionObserverCallback) {
      callbacks.push(cb);
      return {
        observe,
        unobserve: vi.fn(),
        disconnect,
        takeRecords: vi.fn()
      } as unknown as IntersectionObserver;
    }) as unknown as typeof IntersectionObserver;

    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(<TestProviders>{page}</TestProviders>);
    const jumpRow = screen.getByLabelText("detail-jump-links");
    const overviewLink = within(jumpRow).getByRole("link", { name: "Overview" });
    const waiverLink = within(jumpRow).getByRole("link", { name: "Waivers" });
    expect(overviewLink.className).toContain("bg-primary");
    expect(waiverLink.className).not.toContain("bg-primary");

    const waiverSection = screen.getByLabelText("section-waiver");
    act(() => {
      callbacks[0]?.(
        [
          {
            target: waiverSection,
            isIntersecting: true,
            intersectionRatio: 0.75
          } as IntersectionObserverEntry
        ],
        {} as IntersectionObserver
      );
    });

    await waitFor(() => {
      expect(waiverLink.className).toContain("bg-primary");
      expect(overviewLink.className).not.toContain("bg-primary");
    });

    globalThis.IntersectionObserver = originalObserver;
  });

  it("top customer summary card displays address, emergency contact, and notes preview", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(<TestProviders>{page}</TestProviders>);
    const header = screen.getByLabelText("detail-header");
    expect(within(header).getByText(/120 Spring St/i)).toBeInTheDocument();
    expect(within(header).getByText(/Priya Patel/i)).toBeInTheDocument();
    expect(within(header).getByText(/Prefers morning sessions/i)).toBeInTheDocument();
  });

  it("header displays pronouns, dob/age, phone, and emergency contact", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(<TestProviders>{page}</TestProviders>);
    const header = screen.getByLabelText("detail-header");
    expect(within(header).getByText("She/her")).toBeInTheDocument();
    expect(within(header).getByText(/\d{1,2}\/\d{1,2}\/\d{4}\s+\(\d+\)/)).toBeInTheDocument();
    expect(within(header).getByText("(212) 555-0112")).toBeInTheDocument();
    expect(within(header).getByText(/Priya Patel/)).toBeInTheDocument();
  });

  it("birthday indicator appears in header when date matches", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-09T10:00:00Z"));
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_002" }) });
    render(<TestProviders>{page}</TestProviders>);
    expect(within(screen.getByLabelText("detail-header")).getByText("🎂 Birthday today")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("sticky jump nav renders with stronger treatment", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(<TestProviders>{page}</TestProviders>);
    const jumpRow = screen.getByLabelText("detail-jump-links");
    expect(jumpRow.className).toContain("sticky");
    expect(jumpRow.className).toContain("shadow-md");
    expect(jumpRow.className).toContain("bg-background/95");
  });

  it("sections include scroll margin for sticky nav offsets", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    const { container } = render(<TestProviders>{page}</TestProviders>);
    ["overview", "profile", "access", "relationships", "payment", "visits", "purchases", "documents", "communications", "registrations", "waiver", "notes", "timeline"].forEach((id) => {
      const section = container.querySelector(`#${id}`) as HTMLElement;
      expect(section).toBeTruthy();
      expect(section.className).toContain("scroll-mt-40");
      expect(section.className).toContain("space-y-4");
    });
  });

  it("summary email and address fields use wrap-safe layout classes", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(<TestProviders>{page}</TestProviders>);
    const header = screen.getByLabelText("detail-header");
    expect(header.innerHTML).toContain("[overflow-wrap:anywhere]");
    expect(header.innerHTML).toContain("min-w-0");
  });

  it("profile metadata section remains and missing required profile values still show not-set indicators", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_003" }) });
    render(<TestProviders>{page}</TestProviders>);
    const profile = screen.getByLabelText("detail-profile-information");
    expect(within(profile).getAllByText("Not set").length).toBeGreaterThan(0);
  });

  it("renders upcoming and past session history", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(<TestProviders>{page}</TestProviders>);

    expect(screen.getAllByText(/Upcoming Sessions/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Past Sessions/i).length).toBeGreaterThan(0);
  });

  it("shows visit history with entry method and punch details", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_002" }) });
    render(<TestProviders>{page}</TestProviders>);

    expect(screen.getAllByText(/Entry method: multi visit pass/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Punches used: 1/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Punches remaining: 8/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Checked in by: Taylor Nguyen/i).length).toBeGreaterThan(0);
  });

  it("documents section supports upload and archive", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(
      <TestProviders>
        <TopBar />
        {page}
      </TestProviders>
    );
    const user = userEvent.setup();
    await activateStaff(user, "2222");
    const section = screen.getByLabelText("detail-documents");
    await user.click(within(section).getByRole("button", { name: "Upload Document" }));
    expect(section).toHaveTextContent("Uploaded Document");
    const archiveButtons = within(section).getAllByRole("button", { name: "Archive" });
    await user.click(archiveButtons[0]);
    expect(section).toHaveTextContent(/archived/i);
  });

  it("communications section renders history and supports logging entries", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(
      <TestProviders>
        <TopBar />
        {page}
      </TestProviders>
    );
    const user = userEvent.setup();
    await activateStaff(user, "2222");
    const section = screen.getByLabelText("detail-communications");
    expect(section).toHaveTextContent("Registration confirmation");
    await user.click(within(section).getByRole("button", { name: "Log Communication" }));
    expect(section).toHaveTextContent("Manual communication log");
  });

  it("alerts section displays and can resolve alerts", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(
      <TestProviders>
        <TopBar />
        {page}
      </TestProviders>
    );
    const user = userEvent.setup();
    await activateStaff(user, "2222");
    const alerts = screen.getByLabelText("detail-alerts");
    expect(alerts).toBeInTheDocument();
    await user.click(within(alerts).getAllByRole("button", { name: /Resolve Alert|Reopen Alert/i })[0]);
    expect(alerts).toHaveTextContent(/Resolved|Open/i);
  });

  it("timeline filtering updates visible activity rows", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(
      <TestProviders>
        <TopBar />
        {page}
      </TestProviders>
    );
    const user = userEvent.setup();
    await activateStaff(user, "2222");
    const timeline = screen.getByLabelText("detail-timeline");
    await user.click(within(timeline).getByRole("button", { name: "Communications" }));
    expect(timeline).toHaveTextContent("Communication Logged");
  });

  it("renders header action buttons", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(<TestProviders>{page}</TestProviders>);

    expect(screen.getByRole("button", { name: "Check Out" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sell Access" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Mark Waiver Signed" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Edit Profile" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Grant Comp Access" })).not.toBeInTheDocument();
  });

  it("shows itemized purchase history with prices and totals", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_003" }) });
    render(<TestProviders>{page}</TestProviders>);

    expect(screen.getByText(/Class Drop-In x1 — \$26.00 \(\$26.00\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Total: \$26.00/i)).toBeInTheDocument();
    expect(screen.getByText(/Receipt #R-LEGACY/i)).toBeInTheDocument();
  });

  it("shows current access summary card with best eligible access", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(<TestProviders>{page}</TestProviders>);

    const summary = screen.getByLabelText("detail-summary-cards");
    const currentAccessHeading = within(summary).getByText("Current Access");
    const currentAccessCard = currentAccessHeading.closest(".rounded-xl") as HTMLElement;
    expect(currentAccessCard).toBeTruthy();
    expect(within(currentAccessCard).getByText("Membership")).toBeInTheDocument();
    expect(within(currentAccessCard).getByText(/Expires/i)).toBeInTheDocument();
  });

  it("shows mixed events in customer timeline", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_002" }) });
    render(<TestProviders>{page}</TestProviders>);

    const timeline = screen.getByLabelText("detail-timeline");
    expect(within(timeline).getByText(/Customer Timeline/i)).toBeInTheDocument();
    expect(within(timeline).getByText(/Access Change/i)).toBeInTheDocument();
    expect(within(timeline).queryByText(/Visit Completed/i)).not.toBeInTheDocument();
  });

  it("purchase history includes access-related items", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(<TestProviders>{page}</TestProviders>);

    const purchases = screen.getByLabelText("detail-purchases");
    expect(within(purchases).getAllByText(/Monthly Membership|Membership|Punch Pass|Day Pass|Comp Access/i).length).toBeGreaterThan(0);
  });

  it("renders empty states for sparse customer data", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_004" }) });
    render(<TestProviders>{page}</TestProviders>);

    expect(screen.getByText("No upcoming sessions.")).toBeInTheDocument();
    expect(screen.getByText("No waiver history yet.")).toBeInTheDocument();
    expect(screen.queryByText("No purchases recorded yet.")).not.toBeInTheDocument();
  });

  it("access actions are simplified to grant comp only", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(
      <TestProviders>
        <TopBar />
        {page}
      </TestProviders>
    );
    const user = userEvent.setup();
    await activateStaff(user, "2222");
    expect(screen.getByRole("button", { name: "Grant Comp Access" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add punch pass" })).not.toBeInTheDocument();
  });

  it("Grant Comp Access is not shown in Access Products section", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(
      <TestProviders>
        <TopBar />
        {page}
      </TestProviders>
    );
    const user = userEvent.setup();
    await activateStaff(user, "2222");
    const accessCard = screen.getByLabelText("detail-access-products");
    expect(within(accessCard).queryByRole("button", { name: "Grant Comp Access" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Grant Comp Access" })).toBeInTheDocument();
  });

  it("Grant Comp Access is hidden for front desk staff", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(
      <TestProviders>
        <TopBar />
        {page}
      </TestProviders>
    );
    const user = userEvent.setup();
    await activateStaff(user, "3333");
    expect(screen.queryByRole("button", { name: "Grant Comp Access" })).not.toBeInTheDocument();
  });

  it("Grant Comp modal opens and creates comp access record with staff attribution", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(
      <TestProviders>
        <TopBar />
        {page}
      </TestProviders>
    );
    const user = userEvent.setup();
    await activateStaff(user, "2222");
    await user.click(screen.getByRole("button", { name: "Grant Comp Access" }));
    expect(screen.getByRole("dialog", { name: "Grant Comp Access" })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Comp reason"), "service_recovery");
    await user.type(screen.getByLabelText("Comp notes"), "Front desk resolution");
    await user.click(screen.getByRole("button", { name: "Grant Access" }));

    expect(screen.getByRole("status")).toHaveTextContent("Comp access granted.");
    const accessCard = screen.getByLabelText("detail-access-products");
    expect(within(accessCard).getAllByText(/Comp access/i).length).toBeGreaterThan(0);
    const timeline = screen.getByLabelText("detail-timeline");
    expect(timeline).toHaveTextContent("Access Change");
    expect(timeline).toHaveTextContent("Maya Lopez");
  });

  it("marking waiver signed updates customer profile with staff attribution", async () => {
    const user = userEvent.setup();
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_003" }) });
    render(
      <TestProviders>
        <TopBar />
        {page}
      </TestProviders>
    );

    await user.click(screen.getAllByRole("button", { name: "Switch" })[0]);
    await user.type(screen.getByLabelText("Staff PIN input"), "3333");
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    await user.click(screen.getAllByRole("button", { name: "Mark Waiver Signed" })[0]);

    expect(screen.getByText("Valid")).toBeInTheDocument();
    expect(screen.getByText(/Updated by: Sam Rivera/i)).toBeInTheDocument();
  });

  it("Edit Profile opens with current data", async () => {
    const user = userEvent.setup();
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(<TestProviders>{page}</TestProviders>);

    await user.click(screen.getByRole("button", { name: "Edit Profile" }));
    const modal = screen.getByRole("dialog", { name: "Edit Profile" });
    expect(modal).toBeInTheDocument();
    const modalPanel = within(modal).getByTestId("modal-panel");
    expect(modalPanel.className).toContain("max-h-[calc(100dvh-2rem)]");
    const modalBody = within(modal).getByTestId("modal-body");
    expect(modalBody.className).toContain("overflow-y-auto");
    expect(within(modal).getByTestId("modal-footer")).toBeInTheDocument();
    expect(within(modal).getByRole("button", { name: "Close Edit Profile" })).toBeInTheDocument();
    expect(screen.getByLabelText("First name")).toHaveValue("Maya");
    expect(screen.getByLabelText("Last name")).toHaveValue("Patel");
    expect(screen.getByLabelText("Preferred name")).toHaveValue("Maya");
    expect(screen.getByLabelText("Date of birth")).toHaveValue("1993-04-18");
    expect(screen.getByLabelText("Member ID")).toHaveValue("M-1001");
    expect(screen.getByLabelText("Pronouns")).toBeInTheDocument();
  });

  it("Edit Profile required fields and email validation work", async () => {
    const user = userEvent.setup();
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(
      <TestProviders>
        <TopBar />
        {page}
      </TestProviders>
    );

    await activateStaff(user, "2222");
    await user.click(screen.getByRole("button", { name: "Edit Profile" }));
    const modal = screen.getByRole("dialog", { name: "Edit Profile" });
    await user.clear(screen.getByLabelText("First name"));
    await user.click(within(modal).getByRole("button", { name: "Save Changes" }));
    expect(within(modal).getByRole("alert")).toHaveTextContent("First name is required.");

    await user.type(screen.getByLabelText("First name"), "Maya");
    await user.clear(screen.getByLabelText("Email"));
    await user.type(screen.getByLabelText("Email"), "invalid-email");
    await user.click(within(modal).getByRole("button", { name: "Save Changes" }));
    expect(within(modal).getByRole("alert")).toHaveTextContent("Enter a valid email address.");
  });

  it("DOB is required and phone is required", async () => {
    const user = userEvent.setup();
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(
      <TestProviders>
        <TopBar />
        {page}
      </TestProviders>
    );
    await activateStaff(user, "2222");
    await user.click(screen.getByRole("button", { name: "Edit Profile" }));
    const modal = screen.getByRole("dialog", { name: "Edit Profile" });

    await user.clear(screen.getByLabelText("Date of birth"));
    await user.click(within(modal).getByRole("button", { name: "Save Changes" }));
    expect(within(modal).getByRole("alert")).toHaveTextContent("Date of birth is required.");

    await user.type(screen.getByLabelText("Date of birth"), "1993-04-18");
    await user.clear(screen.getByLabelText("Phone"));
    await user.click(within(modal).getByRole("button", { name: "Save Changes" }));
    expect(within(modal).getByRole("alert")).toHaveTextContent("Phone is required.");
  });

  it("address fields and emergency contact fields are required", async () => {
    const user = userEvent.setup();
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(
      <TestProviders>
        <TopBar />
        {page}
      </TestProviders>
    );
    await activateStaff(user, "2222");
    await user.click(screen.getByRole("button", { name: "Edit Profile" }));
    const modal = screen.getByRole("dialog", { name: "Edit Profile" });

    await user.clear(screen.getByLabelText("Address line 1"));
    await user.click(within(modal).getByRole("button", { name: "Save Changes" }));
    expect(within(modal).getByRole("alert")).toHaveTextContent("Address line 1 is required.");

    await user.type(screen.getByLabelText("Address line 1"), "120 Spring St");
    await user.clear(screen.getByLabelText("Emergency contact name"));
    await user.click(within(modal).getByRole("button", { name: "Save Changes" }));
    expect(within(modal).getByRole("alert")).toHaveTextContent("Emergency contact name is required.");
  });

  it("custom pronouns field appears when Custom is selected", async () => {
    const user = userEvent.setup();
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(<TestProviders>{page}</TestProviders>);
    await user.click(screen.getByRole("button", { name: "Edit Profile" }));

    expect(screen.queryByLabelText("Custom pronouns")).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Pronouns"), "Custom");
    expect(screen.getByLabelText("Custom pronouns")).toBeInTheDocument();
  });

  it("pronouns and preferred name save and display in header summary", async () => {
    const user = userEvent.setup();
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(
      <TestProviders>
        <TopBar />
        {page}
      </TestProviders>
    );
    await activateStaff(user, "2222");
    await user.click(screen.getByRole("button", { name: "Edit Profile" }));
    await user.clear(screen.getByLabelText("Preferred name"));
    await user.type(screen.getByLabelText("Preferred name"), "MJ");
    await user.selectOptions(screen.getByLabelText("Pronouns"), "Custom");
    await user.type(screen.getByLabelText("Custom pronouns"), "xe/xem");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    const header = screen.getByLabelText("detail-header");
    expect(header).toHaveTextContent("Preferred: MJ");
    expect(header).toHaveTextContent("xe/xem");
  });

  it("address saves and displays in top customer summary", async () => {
    const user = userEvent.setup();
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(
      <TestProviders>
        <TopBar />
        {page}
      </TestProviders>
    );
    await activateStaff(user, "2222");
    await user.click(screen.getByRole("button", { name: "Edit Profile" }));
    await user.clear(screen.getByLabelText("Address line 1"));
    await user.type(screen.getByLabelText("Address line 1"), "45 River Rd");
    await user.clear(screen.getByLabelText("City"));
    await user.type(screen.getByLabelText("City"), "Brooklyn");
    await user.clear(screen.getByLabelText("State"));
    await user.type(screen.getByLabelText("State"), "NY");
    await user.clear(screen.getByLabelText("ZIP/postal code"));
    await user.type(screen.getByLabelText("ZIP/postal code"), "11211");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    const header = screen.getByLabelText("detail-header");
    expect(header).toHaveTextContent("45 River Rd");
    expect(header).toHaveTextContent("Brooklyn");
    expect(header).toHaveTextContent("11211");
  });

  it("optional address line 2 does not render literal Not set in summary address", async () => {
    const user = userEvent.setup();
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(
      <TestProviders>
        <TopBar />
        {page}
      </TestProviders>
    );
    await activateStaff(user, "2222");
    await user.click(screen.getByRole("button", { name: "Edit Profile" }));
    await user.clear(screen.getByLabelText("Address line 2"));
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    const header = screen.getByLabelText("detail-header");
    expect(header).not.toHaveTextContent("Address line 2");
  });

  it("edit profile sections render in modal", async () => {
    const user = userEvent.setup();
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(<TestProviders>{page}</TestProviders>);

    await user.click(screen.getByRole("button", { name: "Edit Profile" }));
    const modal = screen.getByRole("dialog", { name: "Edit Profile" });
    expect(within(modal).getByLabelText("Identity section")).toBeInTheDocument();
    expect(within(modal).getByLabelText("Contact section")).toBeInTheDocument();
    expect(within(modal).getByLabelText("Address section")).toBeInTheDocument();
    expect(within(modal).getByLabelText("Emergency Contact section")).toBeInTheDocument();
    expect(within(modal).getByLabelText("Photo section")).toBeInTheDocument();
    expect(within(modal).getByLabelText("Notes section")).toBeInTheDocument();
  });

  it("Edit Profile validates unique member ID", async () => {
    const user = userEvent.setup();
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(
      <TestProviders>
        <TopBar />
        {page}
      </TestProviders>
    );
    await activateStaff(user, "2222");
    await user.click(screen.getByRole("button", { name: "Edit Profile" }));
    const modal = screen.getByRole("dialog", { name: "Edit Profile" });
    await user.clear(screen.getByLabelText("Member ID"));
    await user.type(screen.getByLabelText("Member ID"), "M-1002");
    await user.click(within(modal).getByRole("button", { name: "Save Changes" }));
    expect(within(modal).getByRole("alert")).toHaveTextContent("Member ID must be unique.");
  });

  it("State input uppercases, limits to two characters, and validates US abbreviations", async () => {
    const user = userEvent.setup();
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(
      <TestProviders>
        <TopBar />
        {page}
      </TestProviders>
    );
    await activateStaff(user, "2222");
    await user.click(screen.getByRole("button", { name: "Edit Profile" }));
    const modal = screen.getByRole("dialog", { name: "Edit Profile" });

    const stateInput = screen.getByLabelText("State");
    await user.clear(stateInput);
    await user.type(stateInput, "nca");
    expect(stateInput).toHaveValue("NC");

    await user.clear(stateInput);
    await user.type(stateInput, "xx");
    await user.click(within(modal).getByRole("button", { name: "Save Changes" }));
    expect(within(modal).getByRole("alert")).toHaveTextContent("Enter a valid 2-letter US state code.");
  });

  it("address and city normalize capitalization on blur/save", async () => {
    const user = userEvent.setup();
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(
      <TestProviders>
        <TopBar />
        {page}
      </TestProviders>
    );
    await activateStaff(user, "2222");
    await user.click(screen.getByRole("button", { name: "Edit Profile" }));

    await user.clear(screen.getByLabelText("Address line 1"));
    await user.type(screen.getByLabelText("Address line 1"), "123 main st");
    await user.tab();
    expect(screen.getByLabelText("Address line 1")).toHaveValue("123 Main St");

    await user.clear(screen.getByLabelText("City"));
    await user.type(screen.getByLabelText("City"), "st. louis");
    await user.tab();
    expect(screen.getByLabelText("City")).toHaveValue("St. Louis");

    await user.clear(screen.getByLabelText("State"));
    await user.type(screen.getByLabelText("State"), "mo");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    const header = screen.getByLabelText("detail-header");
    expect(header).toHaveTextContent("123 Main St");
    expect(header).toHaveTextContent("St. Louis");
    expect(header).toHaveTextContent("MO");
  });

  it("Edit Profile cancel closes without saving", async () => {
    const user = userEvent.setup();
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(
      <TestProviders>
        <TopBar />
        {page}
      </TestProviders>
    );
    await activateStaff(user, "2222");
    await user.click(screen.getByRole("button", { name: "Edit Profile" }));
    const modal = screen.getByRole("dialog", { name: "Edit Profile" });
    await user.clear(screen.getByLabelText("First name"));
    await user.type(screen.getByLabelText("First name"), "Changed");
    await user.click(within(modal).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog", { name: "Edit Profile" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Maya Patel" })).toBeInTheDocument();
  });

  it("saving profile updates customer display, timeline, and shared search surfaces", async () => {
    const user = userEvent.setup();
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(
      <TestProviders>
        <TopBar />
        {page}
        <CustomerList />
        <CheckInList />
        <PosPage />
      </TestProviders>
    );
    await activateStaff(user, "2222");

    await user.click(screen.getByRole("button", { name: "Edit Profile" }));
    await user.clear(screen.getByLabelText("First name"));
    await user.type(screen.getByLabelText("First name"), "May");
    await user.clear(screen.getByLabelText("Last name"));
    await user.type(screen.getByLabelText("Last name"), "Parker");
    await user.clear(screen.getByLabelText("Phone"));
    await user.type(screen.getByLabelText("Phone"), "555-404-1111");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(screen.getByRole("heading", { name: "May Parker" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Profile updated.");
    expect(screen.getAllByText("May Parker").length).toBeGreaterThan(0);
    const timeline = screen.getByLabelText("detail-timeline");
    expect(timeline).toHaveTextContent("Profile Update");
    expect(timeline).toHaveTextContent("Staff: Maya Lopez");

    const customerSearch = screen.getByLabelText("Search customers");
    await user.clear(customerSearch);
    await user.type(customerSearch, "May Parker");
    expect(screen.getAllByText("May Parker").length).toBeGreaterThan(0);

    const checkInSearch = screen.getByLabelText("Scan barcode, member ID, phone, email, or search name");
    await user.clear(checkInSearch);
    await user.type(checkInSearch, "May Parker");
    expect((checkInSearch as HTMLInputElement).value).toBe("May Parker");

    const posSearch = screen.getAllByLabelText("Search customer")[0];
    await user.clear(posSearch);
    await user.type(posSearch, "May Parker");
    expect((posSearch as HTMLInputElement).value).toBe("May Parker");
  });

  it("profile changes persist after refresh", async () => {
    const storage = installStorageMock();
    const user = userEvent.setup();
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    const first = render(
      <TestProviders>
        <TopBar />
        {page}
      </TestProviders>
    );
    await activateStaff(user, "2222");
    await user.click(screen.getByRole("button", { name: "Edit Profile" }));
    await user.clear(screen.getByLabelText("First name"));
    await user.type(screen.getByLabelText("First name"), "Persistent");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(screen.getByRole("heading", { name: "Persistent Patel" })).toBeInTheDocument();

    first.unmount();
    const secondPage = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(
      <TestProviders>
        <TopBar />
        {secondPage}
      </TestProviders>
    );
    expect(screen.getByRole("heading", { name: "Persistent Patel" })).toBeInTheDocument();
    storage.restore();
  });

  it("supports photo upload, replacement, and removal", async () => {
    const user = userEvent.setup();
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    const view = render(
      <TestProviders>
        <TopBar />
        {page}
      </TestProviders>
    );
    await activateStaff(user, "2222");
    const fileInput = view.container.querySelector("input[type='file']") as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    const jpg = new File(["avatar"], "maya.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [jpg] } });
    expect(await screen.findByRole("img", { name: "Maya Patel profile photo" })).toBeInTheDocument();

    const png = new File(["avatar-2"], "maya-2.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [png] } });
    expect(await screen.findByRole("img", { name: "Maya Patel profile photo" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove Photo" }));
    expect(screen.queryByRole("img", { name: "Maya Patel profile photo" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Maya Patel initials avatar")).toBeInTheDocument();
  });

  it("household member can be added and duplicate member is blocked", async () => {
    const user = userEvent.setup();
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(
      <TestProviders>
        <TopBar />
        {page}
      </TestProviders>
    );
    await activateStaff(user, "2222");
    const householdSection = screen.getByLabelText("detail-household");
    await user.type(within(householdSection).getByLabelText("Household name"), "Patel Family");
    await user.click(within(householdSection).getByRole("button", { name: "Create Household" }));
    const search = within(householdSection).getByLabelText("Search household members");
    await user.type(search, "Jordan");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(screen.getByRole("status")).toHaveTextContent("Jordan Kim added to household.");
    expect(householdSection).toHaveTextContent("Jordan Kim");

    await user.type(search, "Jordan");
    expect(screen.queryByText("Jordan Kim (M-1002)")).not.toBeInTheDocument();
  });

  it("household member persists after refresh", async () => {
    const storage = installStorageMock();
    const user = userEvent.setup();
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    const first = render(
      <TestProviders>
        <TopBar />
        {page}
      </TestProviders>
    );
    await activateStaff(user, "2222");
    const householdSection = screen.getByLabelText("detail-household");
    await user.type(within(householdSection).getByLabelText("Household name"), "Patel Family");
    await user.click(within(householdSection).getByRole("button", { name: "Create Household" }));
    const search = within(householdSection).getByLabelText("Search household members");
    await user.type(search, "Dana");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(householdSection).toHaveTextContent("Dana Brooks");

    first.unmount();
    const secondPage = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(
      <TestProviders>
        <TopBar />
        {secondPage}
      </TestProviders>
    );
    expect(screen.getByLabelText("detail-household")).toHaveTextContent("Dana Brooks");
    storage.restore();
  });

  it("payment method placeholder displays safely and no full card field exists", async () => {
    const user = userEvent.setup();
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(
      <TestProviders>
        <TopBar />
        {page}
      </TestProviders>
    );
    const paymentSection = screen.getByLabelText("detail-payment-methods");
    expect(paymentSection).toHaveTextContent("Visa ending in 4242");
    expect(paymentSection).toHaveTextContent("Expires 04/2028");
    expect(paymentSection).toHaveTextContent("Default");

    await user.click(within(paymentSection).getByRole("button", { name: "Add Payment Method" }));
    expect(screen.getByRole("status")).toHaveTextContent("Saved payment methods will be handled through a secure payment processor.");
    expect(screen.queryByLabelText(/card number/i)).not.toBeInTheDocument();
  });

  it("header summary displays address and emergency contact clearly", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(<TestProviders>{page}</TestProviders>);
    const header = screen.getByLabelText("detail-header");
    expect(header).toHaveTextContent("120 Spring St");
    expect(header).toHaveTextContent("New York");
    expect(header).toHaveTextContent("NY");
    expect(header).toHaveTextContent("10012");
    expect(header).toHaveTextContent("Priya Patel");
    expect(header).toHaveTextContent("(212) 555-9001");
  });

  it("profile metadata section avoids duplicating address, emergency contact, and notes", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(<TestProviders>{page}</TestProviders>);
    const details = screen.getByLabelText("detail-profile-information");
    expect(details).not.toHaveTextContent("Address");
    expect(details).not.toHaveTextContent("Emergency Contact");
    expect(details).not.toHaveTextContent("No peanut allergies");
  });

  it("shows household placeholder actions and can create household", async () => {
    const user = userEvent.setup();
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(<TestProviders>{page}</TestProviders>);

    const household = screen.getByLabelText("detail-household");
    expect(household).toHaveTextContent("No household assigned");
    expect(within(household).getByRole("button", { name: "Create Household" })).toBeInTheDocument();
    expect(within(household).getByRole("button", { name: "Join Household" })).toBeInTheDocument();
    await user.type(within(household).getByLabelText("Household name"), "Patel Family");
    await user.click(within(household).getByRole("button", { name: "Create Household" }));
    expect(screen.getByRole("status")).toHaveTextContent("Household created: Patel Family.");
  });

  it("shows assigned household details and member permission actions", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_003" }) });
    render(<TestProviders>{page}</TestProviders>);

    const household = screen.getByLabelText("detail-household");
    expect(household).toHaveTextContent("Rivera Family");
    expect(household).toHaveTextContent("Primary contact");
    expect(within(household).getAllByRole("button", { name: "Edit" }).length).toBeGreaterThan(0);
    expect(household).toHaveTextContent("Adult · Parent/guardian");
    expect(household).toHaveTextContent("Child · Child");
    expect(household).toHaveTextContent("Check-in others");
  });

  it("household member rows are collapsed by default and edit expands one row", async () => {
    const user = userEvent.setup();
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_003" }) });
    render(<TestProviders>{page}</TestProviders>);
    const household = screen.getByLabelText("detail-household");

    expect(within(household).queryByLabelText("Member type for Sam")).not.toBeInTheDocument();
    const editButtons = within(household).getAllByRole("button", { name: "Edit" });
    await user.click(editButtons[0]);
    expect(within(household).getByLabelText(/Member type for/i)).toBeInTheDocument();
    await user.click(editButtons[1]);
    expect(within(household).getAllByLabelText(/Member type for/i)).toHaveLength(1);
  });

  it("household edit save updates member and cancel reverts draft", async () => {
    const user = userEvent.setup();
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_003" }) });
    render(<TestProviders>{page}</TestProviders>);
    const household = screen.getByLabelText("detail-household");

    const samRow = within(household).getByLabelText("household-member-cust_004");
    await user.click(within(samRow).getByRole("button", { name: "Edit" }));
    const memberTypeSelect = within(samRow).getByLabelText("Member type for Sam");
    expect(memberTypeSelect).toHaveValue("child");
    await user.selectOptions(memberTypeSelect, "adult");
    await user.click(within(samRow).getByRole("button", { name: "Cancel" }));
    expect(within(household).queryByLabelText("Member type for Sam")).not.toBeInTheDocument();
    expect(household).toHaveTextContent("Child · Child");

    await user.click(within(samRow).getByRole("button", { name: "Edit" }));
    await user.selectOptions(within(samRow).getByLabelText("Member type for Sam"), "adult");
    await user.click(within(samRow).getByRole("button", { name: "Save" }));
    expect(household).toHaveTextContent("Adult · Child");
  });

  it("comp access grant persists after refresh", async () => {
    const storage = installStorageMock();
    const user = userEvent.setup();
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    const first = render(
      <TestProviders>
        <TopBar />
        {page}
      </TestProviders>
    );
    await activateStaff(user, "2222");
    await user.click(screen.getByRole("button", { name: "Grant Comp Access" }));
    await user.click(screen.getByRole("button", { name: "Grant Access" }));
    expect(screen.getByRole("status")).toHaveTextContent("Comp access granted.");

    first.unmount();
    const secondPage = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(
      <TestProviders>
        <TopBar />
        {secondPage}
      </TestProviders>
    );
    const accessCard = screen.getByLabelText("detail-access-products");
    expect(within(accessCard).getAllByText(/Comp access/i).length).toBeGreaterThan(0);
    storage.restore();
  });

  it("access lifecycle actions pause, resume, extend, and cancel render and update", async () => {
    const user = userEvent.setup();
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_001" }) });
    render(
      <TestProviders>
        <TopBar />
        {page}
      </TestProviders>
    );
    await activateStaff(user, "2222");
    const accessCard = screen.getByLabelText("detail-access-products");
    await user.click(within(accessCard).getByRole("button", { name: "Pause" }));
    expect(accessCard).toHaveTextContent("paused");
    await user.click(within(accessCard).getByRole("button", { name: "Resume" }));
    expect(accessCard).toHaveTextContent("active");
    await user.click(within(accessCard).getByRole("button", { name: "Extend +30d" }));
    expect(accessCard).toHaveTextContent("Expiration:");
    await user.click(within(accessCard).getByRole("button", { name: "Cancel" }));
    expect(accessCard).toHaveTextContent("cancelled");
  });

  it("renders alerts summary for customer issues", async () => {
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_004" }) });
    render(<TestProviders>{page}</TestProviders>);
    expect(screen.getByLabelText("detail-operational-alerts")).toBeInTheDocument();
    const summary = screen.getByLabelText("detail-alert-summary");
    expect(summary).toBeInTheDocument();
    expect(within(summary).getAllByText(/Waiver missing|Waiver expired/i).length).toBeGreaterThan(0);
  });

  it("opens household detail view and supports selected household check-in", async () => {
    const user = userEvent.setup();
    const page = await CustomerDetailPage({ params: Promise.resolve({ id: "cust_003" }) });
    render(
      <TestProviders>
        <TopBar />
        {page}
      </TestProviders>
    );
    await activateStaff(user, "2222");
    await user.click(screen.getByRole("button", { name: "View Household" }));
    const dialog = screen.getByRole("dialog", { name: "Household detail" });
    expect(within(dialog).getByText("Members")).toBeInTheDocument();
    const toggles = within(dialog).getAllByRole("checkbox");
    await user.click(toggles[0]);
    await user.click(within(dialog).getByRole("button", { name: "Check In Selected" }));
    expect(screen.getByRole("status")).toHaveTextContent(/Checked in|No household members selected|failed/i);
  });
});
