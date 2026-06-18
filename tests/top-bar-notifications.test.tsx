import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { sortTopBarNotificationItems, TopBar } from "@/components/layout/top-bar";
import { TestProviders } from "@/tests/test-providers";

vi.mock("next/navigation", () => ({
  usePathname: () => "/o/summit/dashboard"
}));

describe("TopBar notifications", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.cookie = "cairn_mock_auth=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  });

  it("keeps unread state visible until staff explicitly marks an item read", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
      </TestProviders>
    );

    const trigger = screen.getByRole("button", { name: "Open notifications" });
    expect(trigger).toHaveTextContent("2");
    expect(screen.queryByText("Riverstone Nature Center")).not.toBeInTheDocument();

    await user.click(trigger);
    expect(screen.getByText("2 unread")).toBeInTheDocument();
    expect(trigger).toHaveTextContent("2");
    expect(screen.getByText("Cairn Updated")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Cairn Updated/i })).toHaveAttribute("href", "/o/summit/release-notes#release-0-1-0");

    const notificationTitle = screen.getByText("Registration confirmation");
    expect(notificationTitle.closest("[data-read-state]")).toHaveAttribute("data-read-state", "unread");
    expect(screen.getAllByLabelText("Unread")).toHaveLength(2);
    expect(
      notificationTitle.compareDocumentPosition(screen.getByText("Waitlist exists")) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Mark Registration confirmation as read" }));

    await waitFor(() => expect(screen.getByText("1 unread")).toBeInTheDocument());
    expect(screen.getByText("Registration confirmation").closest("[data-read-state]")).toHaveAttribute("data-read-state", "read");
    expect(
      screen.getByText("Waitlist exists").compareDocumentPosition(screen.getByText("Registration confirmation")) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(trigger).toHaveTextContent("1");
  });

  it("renders release update notifications with a release notes link and read control", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
      </TestProviders>
    );

    await user.click(screen.getByRole("button", { name: "Open notifications" }));

    const releaseLink = screen.getByRole("link", { name: /Cairn Updated/i });
    expect(releaseLink).toHaveAttribute("href", "/o/summit/release-notes#release-0-1-0");
    await user.click(screen.getByRole("button", { name: "Mark Cairn Updated as read" }));

    await waitFor(() => expect(screen.getByText("1 unread")).toBeInTheDocument());
    expect(screen.getByText("Cairn Updated").closest("[data-read-state]")).toHaveAttribute("data-read-state", "read");
  });

  it("sorts unread notifications before read items and newest-first within each group", () => {
    const sortedTitles = [
      { id: "older-unread", title: "Older unread", detail: "", kind: "notification" as const, occurredAt: "2026-06-10T09:00:00Z", isUnread: true, communicationId: "older-unread" },
      { id: "newest-read", title: "Newest read", detail: "", kind: "alert" as const, occurredAt: "2026-06-16T09:00:00Z", isUnread: false },
      { id: "newest-unread", title: "Newest unread", detail: "", kind: "notification" as const, occurredAt: "2026-06-15T09:00:00Z", isUnread: true, communicationId: "newest-unread" },
      { id: "older-read", title: "Older read", detail: "", kind: "task" as const, occurredAt: "2026-06-09T09:00:00Z", isUnread: false }
    ].sort(sortTopBarNotificationItems).map((item) => item.title);

    expect(sortedTitles).toEqual(["Newest unread", "Older unread", "Newest read", "Older read"]);
  });
});
