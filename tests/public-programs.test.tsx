import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import PublicProgramsPage, { generateMetadata as generateProgramsMetadata } from "@/app/p/[orgSlug]/programs/page";
import PublicProgramDetailPage, { generateMetadata as generateProgramDetailMetadata } from "@/app/p/[orgSlug]/programs/[programId]/page";
import PublicSessionDetailPage, { generateMetadata as generateSessionDetailMetadata } from "@/app/p/[orgSlug]/sessions/[sessionId]/page";
import { PublicRegistrationPanel } from "@/components/public/public-registration-panel";
import { programs, classCampSessions } from "@/lib/mocks/programs";

describe("public program discovery", () => {
  it("renders public programs page without auth", async () => {
    const Page = await PublicProgramsPage({ params: Promise.resolve({ orgSlug: "summit" }) });
    render(Page);
    expect(screen.getByRole("heading", { name: "Programs" })).toBeInTheDocument();
    expect(screen.getByText(/Browse classes, camps/i)).toBeInTheDocument();
  });

  it("supports registration flow and waitlist mode", async () => {
    const program = programs.find((entry) => entry.id === "prog_606");
    const session = classCampSessions.find((entry) => entry.id === "sess_005");
    if (!program || !session) throw new Error("missing mock data");

    const user = userEvent.setup();
    render(<PublicRegistrationPanel orgSlug="summit" program={program} session={session} />);

    await user.type(screen.getByPlaceholderText("Email login"), "newperson@example.com");
    await user.type(screen.getByPlaceholderText("Full name"), "New Person");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: /Continue Anyway/i }));
    expect(screen.getByRole("button", { name: "Join Waitlist" })).toBeInTheDocument();
  });

  it("blocks duplicate registrations in the flow", async () => {
    const program = programs.find((entry) => entry.id === "prog_101");
    const session = classCampSessions.find((entry) => entry.id === "sess_001");
    if (!program || !session) throw new Error("missing mock data");

    const user = userEvent.setup();
    render(<PublicRegistrationPanel orgSlug="summit" program={program} session={session} />);
    await user.type(screen.getByPlaceholderText("Email login"), "jordan.kim@example.com");
    expect(await screen.findByText(/Duplicate registrations are blocked/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("generates indexable SEO metadata for public program and session pages", async () => {
    const listMetadata = await generateProgramsMetadata({ params: Promise.resolve({ orgSlug: "summit" }) });
    const programMetadata = await generateProgramDetailMetadata({ params: Promise.resolve({ orgSlug: "summit", programId: "prog_101" }) });
    const sessionMetadata = await generateSessionDetailMetadata({ params: Promise.resolve({ orgSlug: "summit", sessionId: "sess_001" }) });

    expect(listMetadata.robots).toEqual({ index: true, follow: true });
    expect(programMetadata.title).toContain("Summit Rec Collective");
    expect(sessionMetadata.description).toMatch(/Session|on/i);
  });

  it("renders program and session detail pages", async () => {
    const ProgramPage = await PublicProgramDetailPage({ params: Promise.resolve({ orgSlug: "summit", programId: "prog_101" }) });
    const SessionPage = await PublicSessionDetailPage({ params: Promise.resolve({ orgSlug: "summit", sessionId: "sess_001" }) });

    render(ProgramPage);
    expect(screen.getByText("Upcoming Sessions")).toBeInTheDocument();

    render(SessionPage);
    expect(screen.getByText("Session Information")).toBeInTheDocument();
  });
});
