import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { CustomerCard } from "@/components/customers/customer-card";
import { resetGlobalDateTimeFormatting, setGlobalDateTimeFormatting } from "@/lib/format/date";
import type { Customer } from "@/types/domain";
import { TestProviders } from "@/tests/test-providers";

describe("CustomerCard quick info", () => {
  beforeEach(() => {
    resetGlobalDateTimeFormatting();
  });

  afterEach(() => {
    resetGlobalDateTimeFormatting();
  });

  it("shows warning values for missing preferred name, pronouns, DOB, and phone", () => {
    const customer: Customer = {
      id: "cust_missing_001",
      memberId: "M-9999",
      organizationId: "org_summit",
      locationId: "loc_001",
      firstName: "Casey",
      lastName: "Missing",
      email: "",
      phone: "",
      tags: [],
      checkInStatus: "out"
    };

    render(
      <TestProviders>
        <CustomerCard
          customer={customer}
          canCheckIn={false}
          blockedReason="No access"
          onSellAccess={() => {}}
          onToggleCheckIn={() => {}}
        />
      </TestProviders>
    );

    const quickInfo = screen.getByLabelText("Quick Info");
    expect(within(quickInfo).getAllByText("Not set").length).toBeGreaterThan(1);
    expect(within(quickInfo).getAllByText("Missing ⚠").length).toBeGreaterThan(1);
  });

  it("shows emergency contact name and phone when present", () => {
    const customer: Customer = {
      id: "cust_emergency_001",
      memberId: "M-9201",
      organizationId: "org_summit",
      locationId: "loc_001",
      firstName: "Riley",
      lastName: "Safety",
      preferredName: "Riley",
      pronouns: "They/them",
      dateOfBirth: "1995-06-22",
      email: "riley@example.com",
      phone: "(212) 555-1111",
      emergencyContactName: "Taylor Safety",
      emergencyContactPhone: "(212) 555-2222",
      tags: [],
      checkInStatus: "out"
    };

    render(
      <TestProviders>
        <CustomerCard
          customer={customer}
          canCheckIn={false}
          blockedReason="Waiver missing."
          onSellAccess={() => {}}
          onToggleCheckIn={() => {}}
        />
      </TestProviders>
    );

    const quickInfo = screen.getByLabelText("Quick Info");
    expect(within(quickInfo).getByText("Emergency Contact")).toBeInTheDocument();
    expect(within(quickInfo).getByText(/Taylor Safety\s*\(212\) 555-2222/)).toBeInTheDocument();
  });

  it("does not render redundant blocked copy on cards", () => {
    const customer: Customer = {
      id: "cust_blocked_001",
      memberId: "M-9101",
      organizationId: "org_summit",
      locationId: "loc_001",
      firstName: "Blocked",
      lastName: "Person",
      preferredName: "Blocked",
      pronouns: "They/them",
      dateOfBirth: "1994-02-11",
      email: "",
      phone: "(212) 555-1212",
      tags: [],
      checkInStatus: "out"
    };

    render(
      <TestProviders>
        <CustomerCard
          customer={customer}
          canCheckIn={false}
          blockedReason="Access Denied: Waiver missing."
          onSellAccess={() => {}}
          onToggleCheckIn={() => {}}
        />
      </TestProviders>
    );

    expect(screen.getByText("Waiver Missing")).toBeInTheDocument();
    expect(screen.getByText("Check In").closest("button")).toBeDisabled();
    expect(screen.queryByText(/Blocked:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Access Denied:/i)).not.toBeInTheDocument();
  });

  it("shows birthday indicator when month/day matches today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-23T10:00:00Z"));

    const customer: Customer = {
      id: "cust_bday_001",
      memberId: "M-9301",
      organizationId: "org_summit",
      locationId: "loc_001",
      firstName: "Birthday",
      lastName: "Person",
      preferredName: "Birthday",
      pronouns: "She/her",
      dateOfBirth: "1990-05-23",
      email: "birthday@example.com",
      phone: "(212) 555-3333",
      tags: [],
      checkInStatus: "out"
    };

    render(
      <TestProviders>
        <CustomerCard
          customer={customer}
          canCheckIn={false}
          blockedReason="Waiver missing."
          onSellAccess={() => {}}
          onToggleCheckIn={() => {}}
        />
      </TestProviders>
    );

    expect(screen.getByText("🎂 Birthday today")).toBeInTheDocument();
    expect(screen.getByText("Say happy birthday to Birthday")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("does not show birthday indicator for non-birthday or missing DOB", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-23T10:00:00Z"));

    const nonBirthday: Customer = {
      id: "cust_non_bday_001",
      memberId: "M-9401",
      organizationId: "org_summit",
      locationId: "loc_001",
      firstName: "Not",
      lastName: "Today",
      pronouns: "He/him",
      dateOfBirth: "1990-06-23",
      email: "",
      phone: "(212) 555-4444",
      tags: [],
      checkInStatus: "out"
    };

    const { rerender } = render(
      <TestProviders>
        <CustomerCard
          customer={nonBirthday}
          canCheckIn
          onSellAccess={() => {}}
          onToggleCheckIn={() => {}}
        />
      </TestProviders>
    );
    expect(screen.queryByText("🎂 Birthday today")).not.toBeInTheDocument();

    const missingDob = { ...nonBirthday, id: "cust_non_bday_002", dateOfBirth: undefined };
    rerender(
      <TestProviders>
        <CustomerCard
          customer={missingDob}
          canCheckIn
          onSellAccess={() => {}}
          onToggleCheckIn={() => {}}
        />
      </TestProviders>
    );
    expect(screen.queryByText("🎂 Birthday today")).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it("uses bottom-pinned action layout classes", () => {
    const customer: Customer = {
      id: "cust_layout_001",
      memberId: "M-9501",
      organizationId: "org_summit",
      locationId: "loc_001",
      firstName: "Layout",
      lastName: "Check",
      preferredName: "Layout",
      pronouns: "They/them",
      dateOfBirth: "1992-03-01",
      email: "layout@example.com",
      phone: "(212) 555-9898",
      tags: [],
      checkInStatus: "out"
    };

    const { container } = render(
      <TestProviders>
        <CustomerCard
          customer={customer}
          canCheckIn={false}
          blockedReason="Waiver missing."
          onSellAccess={() => {}}
          onToggleCheckIn={() => {}}
        />
      </TestProviders>
    );

    const actionWrapper = screen.getByRole("button", { name: "View Profile" }).closest("div")?.parentElement;
    expect(actionWrapper?.className).toContain("mt-auto");
    expect(container.querySelector(".h-full.flex-col")).toBeTruthy();
  });

  it("updates displayed dates when formatting settings change", () => {
    const customer: Customer = {
      id: "cust_format_001",
      memberId: "M-9601",
      organizationId: "org_summit",
      locationId: "loc_001",
      firstName: "Format",
      lastName: "Check",
      preferredName: "Format",
      pronouns: "They/them",
      dateOfBirth: "1992-03-01",
      email: "format@example.com",
      phone: "(212) 555-9898",
      tags: [],
      checkInStatus: "out"
    };

    setGlobalDateTimeFormatting({ dateFormat: "MM/DD/YYYY" });
    const { rerender } = render(
      <TestProviders>
        <CustomerCard customer={customer} canCheckIn onSellAccess={() => {}} onToggleCheckIn={() => {}} />
      </TestProviders>
    );

    expect(screen.getByText(/03\/01\/1992/)).toBeInTheDocument();

    setGlobalDateTimeFormatting({ dateFormat: "DD/MM/YYYY" });
    rerender(
      <TestProviders>
        <CustomerCard customer={customer} canCheckIn onSellAccess={() => {}} onToggleCheckIn={() => {}} />
      </TestProviders>
    );

    expect(screen.getByText(/01\/03\/1992/)).toBeInTheDocument();
  });
});
