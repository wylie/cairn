import { describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TestProviders } from "@/tests/test-providers";
import { PublicCartProvider } from "@/lib/public-cart";
import { WaiverSigningForm } from "@/components/public/waiver-signing-form";
import { waiverTemplates, waiverTemplateVersions } from "@/lib/mocks/waiver-templates";
import { useCustomerState } from "@/lib/state/customer-state";
import { getProgramPricing } from "@/lib/public-programs";
import { programs, classCampSessions } from "@/lib/mocks/programs";
import { PublicRegistrationPanel } from "@/components/public/public-registration-panel";
import KioskWaiversPage from "@/app/p/[orgSlug]/kiosk/waivers/page";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/p/summit/account/waivers",
  useRouter: () => ({ push, refresh: vi.fn() })
}));

function clearSessionCookie() {
  document.cookie = "cairn_mock_auth=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
}

function setCustomerSessionCookie(customerId: string, email = "portal@example.com") {
  const payload = {
    kind: "customer",
    userId: `cust_auth_${customerId}`,
    email,
    organizationSlugs: ["summit"],
    customerId
  };
  const encoded = btoa(JSON.stringify(payload)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  document.cookie = `cairn_mock_auth=${encoded}; path=/`;
}

function setStaffSessionCookie() {
  const payload = {
    kind: "staff",
    userId: "staff_auth_001",
    email: "taylor@summitrec.co",
    organizationSlugs: ["summit"]
  };
  const encoded = btoa(JSON.stringify(payload)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  document.cookie = `cairn_mock_auth=${encoded}; path=/`;
}

describe("online waiver signing", () => {
  beforeEach(() => {
    clearSessionCookie();
  });

  it("supports public signing and guardian relationship", async () => {
    const user = userEvent.setup();
    const template = waiverTemplates.find((entry) => entry.id === "wtpl_general");
    const version = waiverTemplateVersions.find((entry) => entry.id === "wver_general_v2");
    if (!template || !version) throw new Error("Missing waiver fixtures");

    render(
      <TestProviders>
        <WaiverSigningForm orgSlug="summit" template={template} version={version} mode="public" defaultCustomerId="cust_003" />
      </TestProviders>
    );

    await user.type(screen.getByLabelText("Signer name"), "Teresa Fisher");
    await user.selectOptions(screen.getByLabelText("Relationship"), "guardian");
    await user.type(screen.getByPlaceholderText("Type full legal name"), "Teresa Fisher");
    const checkboxes = screen.getAllByRole("checkbox");
    for (const checkbox of checkboxes) {
      await user.click(checkbox);
    }
    await user.click(screen.getByRole("button", { name: "Submit Waiver" }));
    expect(await screen.findByRole("status")).toHaveTextContent(/signed/i);
  });

  it("customer portal signing only shows the authenticated customer household", () => {
    const template = waiverTemplates.find((entry) => entry.id === "wtpl_general");
    const version = waiverTemplateVersions.find((entry) => entry.id === "wver_general_v2");
    if (!template || !version) throw new Error("Missing waiver fixtures");
    setCustomerSessionCookie("cust_003", "alex.rivera@example.com");

    render(
      <TestProviders>
        <WaiverSigningForm orgSlug="summit" template={template} version={version} mode="account" defaultCustomerId="cust_003" />
      </TestProviders>
    );

    expect(screen.getByText("Who is this waiver for?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Alex Rivera/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sam Noaccess/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Dana Daypass/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Jimbo James/i })).not.toBeInTheDocument();
  });

  it("customer can sign for self from the portal without exposing a broader selector", async () => {
    const user = userEvent.setup();
    const template = waiverTemplates.find((entry) => entry.id === "wtpl_general");
    const version = waiverTemplateVersions.find((entry) => entry.id === "wver_general_v2");
    if (!template || !version) throw new Error("Missing waiver fixtures");
    setCustomerSessionCookie("cust_001", "maya.patel@example.com");

    render(
      <TestProviders>
        <WaiverSigningForm orgSlug="summit" template={template} version={version} mode="account" defaultCustomerId="cust_001" />
      </TestProviders>
    );

    expect(screen.queryByPlaceholderText("Search by name, email, phone, or member ID")).not.toBeInTheDocument();
    expect(screen.getByText(/This waiver will be signed for the eligible person on this account/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText("Signer name"), "Maya Patel");
    await user.type(screen.getByPlaceholderText("Type full legal name"), "Maya Patel");
    const checkboxes = screen.getAllByRole("checkbox");
    for (const checkbox of checkboxes) {
      await user.click(checkbox);
    }
    await user.click(screen.getByRole("button", { name: "Submit Waiver" }));
    expect(await screen.findByRole("status")).toHaveTextContent(/signed/i);
  });

  it("guardian can sign for a household member from the customer portal", async () => {
    const user = userEvent.setup();
    const template = waiverTemplates.find((entry) => entry.id === "wtpl_general");
    const version = waiverTemplateVersions.find((entry) => entry.id === "wver_general_v2");
    if (!template || !version) throw new Error("Missing waiver fixtures");
    setCustomerSessionCookie("cust_003", "alex.rivera@example.com");

    render(
      <TestProviders>
        <WaiverSigningForm orgSlug="summit" template={template} version={version} mode="account" defaultCustomerId="cust_004" />
      </TestProviders>
    );

    await user.type(screen.getByLabelText("Signer name"), "Alex Rivera");
    await user.selectOptions(screen.getByLabelText("Relationship"), "guardian");
    await user.type(screen.getByPlaceholderText("Type full legal name"), "Alex Rivera");
    const checkboxes = screen.getAllByRole("checkbox");
    for (const checkbox of checkboxes) {
      await user.click(checkbox);
    }
    await user.click(screen.getByRole("button", { name: "Submit Waiver" }));
    expect(await screen.findByRole("status")).toHaveTextContent(/signed/i);
    expect(screen.getByText((content) => content.includes("Signing for:"))).toBeInTheDocument();
    expect(screen.getAllByText("Sam Noaccess").length).toBeGreaterThan(0);
  });

  it("rejects an unrelated customer id in customer portal signing", () => {
    const template = waiverTemplates.find((entry) => entry.id === "wtpl_general");
    const version = waiverTemplateVersions.find((entry) => entry.id === "wver_general_v2");
    if (!template || !version) throw new Error("Missing waiver fixtures");
    setCustomerSessionCookie("cust_001", "maya.patel@example.com");

    render(
      <TestProviders>
        <WaiverSigningForm orgSlug="summit" template={template} version={version} mode="account" defaultCustomerId="cust_005" />
      </TestProviders>
    );

    expect(screen.getByRole("alert")).toHaveTextContent("You can only sign waivers for yourself or household members you manage.");
    expect(screen.queryByText("Dana Daypass")).not.toBeInTheDocument();
  });

  it("only allows broad kiosk customer lookup in staff-authorized context", async () => {
    const user = userEvent.setup();
    const template = waiverTemplates.find((entry) => entry.id === "wtpl_general");
    const version = waiverTemplateVersions.find((entry) => entry.id === "wver_general_v2");
    if (!template || !version) throw new Error("Missing waiver fixtures");

    setCustomerSessionCookie("cust_001", "maya.patel@example.com");
    const { rerender } = render(
      <TestProviders>
        <WaiverSigningForm orgSlug="summit" template={template} version={version} mode="kiosk" />
      </TestProviders>
    );

    expect(screen.getByText(/Staff authorization is required before searching facility customers from kiosk mode/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Search by name, email, phone, or member ID")).not.toBeInTheDocument();

    clearSessionCookie();
    setStaffSessionCookie();
    rerender(
      <TestProviders>
        <WaiverSigningForm orgSlug="summit" template={template} version={version} mode="kiosk" />
      </TestProviders>
    );

    const search = screen.getByPlaceholderText("Search by name, email, phone, or member ID");
    await user.type(search, "Dana");
    expect(screen.getByRole("button", { name: /Dana Daypass/i })).toBeInTheDocument();
  });

  it("registration flow surfaces waiver signing action when waiver is missing", async () => {
    const user = userEvent.setup();
    const program = programs.find((entry) => entry.id === "prog_606");
    const session = classCampSessions.find((entry) => entry.id === "sess_005");
    if (!program || !session) throw new Error("Missing session fixtures");

    render(
      <TestProviders>
        <PublicCartProvider>
          <PublicRegistrationPanel orgSlug="summit" program={program} session={session} />
        </PublicCartProvider>
      </TestProviders>
    );

    expect(screen.getByRole("link", { name: "Sign Waiver" })).toHaveAttribute("href", expect.stringContaining("/p/summit/waivers/"));
  });

  it("preserves immutable signed waiver snapshots across versions", async () => {
    let stateRef: ReturnType<typeof useCustomerState> | null = null;
    function Probe() {
      stateRef = useCustomerState();
      return null;
    }

    render(
      <TestProviders>
        <Probe />
      </TestProviders>
    );

    if (!stateRef) throw new Error("State missing");

    const beforeCount = stateRef.getSignedWaiverRecordsForCustomer("cust_001").filter((entry) => entry.templateId === "wtpl_general").length;
    let first: { ok: boolean; message: string; waiverId?: string } | undefined;
    await act(async () => {
      first = stateRef!.signWaiverForCustomer({
        customerId: "cust_001",
        templateId: "wtpl_general",
        typedName: "Maya Patel",
        signedByName: "Maya Patel",
        source: "online"
      });
    });
    expect(first?.ok).toBe(true);

    let vResult: { ok: boolean; message: string; versionId?: string } | undefined;
    await act(async () => {
      vResult = stateRef!.createWaiverTemplateVersion({
        templateId: "wtpl_general",
        version: "9.9",
        effectiveDate: "2026-12-01",
        blocks: [{ id: "blk_new", type: "paragraph", label: "Paragraph", content: "New legal language" }]
      });
    });
    expect(vResult?.ok).toBe(true);

    let second: { ok: boolean; message: string; waiverId?: string } | undefined;
    await act(async () => {
      second = stateRef!.signWaiverForCustomer({
        customerId: "cust_001",
        templateId: "wtpl_general",
        typedName: "Maya Patel",
        signedByName: "Maya Patel",
        source: "online"
      });
    });
    expect(second?.ok).toBe(true);

    await waitFor(() => {
      const currentCount = stateRef!.getSignedWaiverRecordsForCustomer("cust_001").filter((entry) => entry.templateId === "wtpl_general").length;
      expect(currentCount).toBeGreaterThan(beforeCount);
    });
    const records = stateRef.getSignedWaiverRecordsForCustomer("cust_001").filter((entry) => entry.templateId === "wtpl_general");
    const oldRecord = records.find((entry) => entry.templateVersion !== records[0].templateVersion);
    expect(oldRecord?.contentSnapshot.some((block) => block.content?.includes("New legal language"))).toBe(false);
  });

  it("check-in enforcement reports waiver blockers", () => {
    let stateRef: ReturnType<typeof useCustomerState> | null = null;
    function Probe() {
      stateRef = useCustomerState();
      return null;
    }
    render(
      <TestProviders>
        <Probe />
      </TestProviders>
    );
    if (!stateRef) throw new Error("State missing");
    const decision = stateRef.evaluateCustomerEntry("cust_004");
    expect(decision.reasons.join(" ").toLowerCase()).toContain("waiver");
  });

  it("renders kiosk signing route", async () => {
    const Page = await KioskWaiversPage({ params: Promise.resolve({ orgSlug: "summit" }) });
    render(<TestProviders>{Page}</TestProviders>);
    expect(screen.getByTestId("waiver-kiosk-mode")).toBeInTheDocument();
  });

  it("pricing still resolves for member/non-member registration context", () => {
    const price = getProgramPricing(programs[0]);
    expect(price.nonMemberCents === null || price.nonMemberCents > 0).toBe(true);
  });
});
