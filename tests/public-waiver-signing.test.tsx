import { describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TestProviders } from "@/tests/test-providers";
import { WaiverSigningForm } from "@/components/public/waiver-signing-form";
import { waiverTemplates, waiverTemplateVersions } from "@/lib/mocks/waiver-templates";
import { useCustomerState } from "@/lib/state/customer-state";
import { getProgramPricing } from "@/lib/public-programs";
import { programs, classCampSessions } from "@/lib/mocks/programs";
import { PublicRegistrationPanel } from "@/components/public/public-registration-panel";
import KioskWaiversPage from "@/app/p/[orgSlug]/kiosk/waivers/page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/p/summit/account/waivers"
}));

describe("online waiver signing", () => {
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

  it("registration flow surfaces waiver signing action when waiver is missing", async () => {
    const user = userEvent.setup();
    const program = programs.find((entry) => entry.id === "prog_606");
    const session = classCampSessions.find((entry) => entry.id === "sess_005");
    if (!program || !session) throw new Error("Missing session fixtures");

    render(
      <TestProviders>
        <PublicRegistrationPanel orgSlug="summit" program={program} session={session} />
      </TestProviders>
    );

    await user.type(screen.getByPlaceholderText("Email login"), "newsignup@example.com");
    await user.type(screen.getByPlaceholderText("Full name"), "New Signup");
    await user.click(screen.getByRole("button", { name: "Continue" }));
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
