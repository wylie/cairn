import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import PublicProgramsPage, { generateMetadata as generateProgramsMetadata } from "@/app/p/[orgSlug]/programs/page";
import PublicProgramDetailPage, { generateMetadata as generateProgramDetailMetadata } from "@/app/p/[orgSlug]/programs/[programId]/page";
import PublicSessionDetailPage, { generateMetadata as generateSessionDetailMetadata } from "@/app/p/[orgSlug]/sessions/[sessionId]/page";
import { PublicRegistrationPanel } from "@/components/public/public-registration-panel";
import { PublicCartProvider } from "@/lib/public-cart";
import { SettingsStateProvider } from "@/lib/state/settings-state";
import { CustomerStateProvider } from "@/lib/state/customer-state";
import { WorkstationStateProvider } from "@/lib/state/workstation-state";
import { programs, classCampSessions } from "@/lib/mocks/programs";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/p/summit/programs/prog_101",
  useRouter: () => ({ push, refresh: vi.fn() })
}));

function PublicTestProviders({ children }: { children: React.ReactNode }) {
  return (
    <WorkstationStateProvider>
      <SettingsStateProvider>
        <CustomerStateProvider>
          <PublicCartProvider>{children}</PublicCartProvider>
        </CustomerStateProvider>
      </SettingsStateProvider>
    </WorkstationStateProvider>
  );
}

describe("public program discovery", () => {
  it("renders public programs page without auth", async () => {
    const Page = await PublicProgramsPage({ params: Promise.resolve({ orgSlug: "summit" }) });
    render(Page);
    expect(screen.getByRole("heading", { name: "Programs" })).toBeInTheDocument();
    expect(screen.getByText(/Browse classes, camps/i)).toBeInTheDocument();
  });

  it("routes session registration into checkout", async () => {
    const program = programs.find((entry) => entry.id === "prog_606");
    const session = classCampSessions.find((entry) => entry.id === "sess_005");
    if (!program || !session) throw new Error("missing mock data");

    const user = userEvent.setup();
    render(
      <PublicTestProviders>
        <PublicRegistrationPanel orgSlug="summit" program={program} session={session} />
      </PublicTestProviders>
    );

    expect(screen.getByRole("button", { name: "Join Waitlist" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Join Waitlist" }));
    expect(push).toHaveBeenCalledWith("/p/summit/checkout");
  });

  it("generates indexable SEO metadata for public program and session pages", async () => {
    const listMetadata = await generateProgramsMetadata({ params: Promise.resolve({ orgSlug: "summit" }) });
    const programMetadata = await generateProgramDetailMetadata({ params: Promise.resolve({ orgSlug: "summit", programId: "prog_101" }) });
    const sessionMetadata = await generateSessionDetailMetadata({ params: Promise.resolve({ orgSlug: "summit", sessionId: "sess_001" }) });

    expect(listMetadata.robots).toEqual({ index: true, follow: true });
    expect(listMetadata.alternates?.canonical).toBe("https://stonecairn.app/p/summit/programs");
    expect(programMetadata.alternates?.canonical).toBe("https://stonecairn.app/p/summit/programs/prog_101");
    expect(sessionMetadata.alternates?.canonical).toBe("https://stonecairn.app/p/summit/sessions/sess_001");
    expect(programMetadata.title).toContain("Summit Rec Collective");
    expect(sessionMetadata.description).toMatch(/Session|on/i);
  });

  it("renders program and session detail pages", async () => {
    const ProgramPage = await PublicProgramDetailPage({ params: Promise.resolve({ orgSlug: "summit", programId: "prog_101" }) });
    const SessionPage = await PublicSessionDetailPage({ params: Promise.resolve({ orgSlug: "summit", sessionId: "sess_001" }) });

    render(<PublicTestProviders>{ProgramPage}</PublicTestProviders>);
    expect(screen.getByText("Upcoming Sessions")).toBeInTheDocument();

    render(<PublicTestProviders>{SessionPage}</PublicTestProviders>);
    expect(screen.getByText("Session Information")).toBeInTheDocument();
  });
});
