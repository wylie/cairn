import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopBar } from "@/components/layout/top-bar";
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
    expect(trigger).toHaveTextContent("1");
    expect(screen.queryByText("Riverstone Nature Center")).not.toBeInTheDocument();

    await user.click(trigger);
    expect(screen.getByText("1 unread")).toBeInTheDocument();
    expect(trigger).toHaveTextContent("1");

    const notificationTitle = screen.getByText("Registration confirmation");
    expect(notificationTitle.closest("[data-read-state]")).toHaveAttribute("data-read-state", "unread");
    expect(screen.getByLabelText("Unread")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Mark Registration confirmation as read" }));

    await waitFor(() => expect(screen.getByText("0 unread")).toBeInTheDocument());
    expect(screen.getByText("Registration confirmation").closest("[data-read-state]")).toHaveAttribute("data-read-state", "read");
    expect(trigger).not.toHaveTextContent("1");
  });
});
