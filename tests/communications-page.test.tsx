import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import CommunicationsPage from "@/app/(app)/communications/page";
import { TopBar } from "@/components/layout/top-bar";
import { CustomerDetailView } from "@/components/customers/customer-detail-view";
import { TestProviders } from "@/tests/test-providers";

vi.mock("next/navigation", () => ({
  usePathname: () => "/communications",
  useSearchParams: () => new URLSearchParams(window.location.search)
}));

describe("Communications hub", () => {
  it("renders message center metrics and composer", () => {
    render(
      <TestProviders>
        <TopBar />
        <CommunicationsPage />
      </TestProviders>
    );

    expect(screen.getByRole("heading", { name: "Communications" })).toBeInTheDocument();
    expect(screen.getByText("Sent Today")).toBeInTheDocument();
    expect(screen.getByText("Unread Notifications")).toBeInTheDocument();
    expect(screen.getByText("Message Composer")).toBeInTheDocument();
    expect(screen.getByText("Automation Triggers")).toBeInTheDocument();
  });

  it("supports send, schedule, and draft creation", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <CommunicationsPage />
      </TestProviders>
    );

    await user.selectOptions(screen.getByLabelText("Template"), "general_announcement");
    await user.selectOptions(screen.getByLabelText("To"), "customer");
    await user.selectOptions(screen.getByLabelText("Recipient"), "cust_001");
    await user.clear(screen.getByLabelText("Subject"));
    await user.type(screen.getByLabelText("Subject"), "Weather closure");
    await user.clear(screen.getByLabelText("Message"));
    await user.type(screen.getByLabelText("Message"), "The facility will open late tomorrow.");
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(screen.getByRole("status")).toHaveTextContent("Message sent.");

    await user.type(screen.getByLabelText("Subject"), "Draft note");
    await user.type(screen.getByLabelText("Message"), "Save for later.");
    await user.click(screen.getByRole("button", { name: "Save Draft" }));
    expect(screen.getByRole("status")).toHaveTextContent("Draft saved.");

    await user.click(screen.getByRole("button", { name: "Schedule" }));
    expect(screen.getByRole("status")).toHaveTextContent("Message scheduled.");
  });

  it("customer detail uses shared communications and preferences", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <CustomerDetailView customerId="cust_001" />
      </TestProviders>
    );

    expect(screen.getByLabelText("detail-communications")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Log Communication" }));
    expect(screen.getByText("Manual communication log")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Marketing"));
    expect(screen.getByLabelText("Marketing")).toBeChecked();
  });
});
