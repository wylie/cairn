import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, vi } from "vitest";
import CommunicationsPage from "@/app/(app)/communications/page";
import { TopBar } from "@/components/layout/top-bar";
import { CustomerDetailView } from "@/components/customers/customer-detail-view";
import { useCustomerState } from "@/lib/state/customer-state";
import { TestProviders } from "@/tests/test-providers";

vi.mock("next/navigation", () => ({
  usePathname: () => "/o/summit/communications",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() })
}));

function setStaffSession() {
  const payload = {
    kind: "staff",
    userId: "auth_owner_summit",
    email: "taylor@summitrec.co",
    organizationSlugs: ["summit"]
  };
  document.cookie = `cairn_mock_auth=${btoa(JSON.stringify(payload)).replaceAll("+", "-").replaceAll("/", "_")}; path=/`;
  document.cookie = "cairn_org_slug=summit; path=/";
}

function OptOutHarness() {
  const { updateCustomerCommunicationPreferences, createCommunication } = useCustomerState();
  const [result, setResult] = React.useState("");
  return (
    <div>
      <button
        type="button"
        onClick={() => {
          updateCustomerCommunicationPreferences("cust_001", { email: false });
          const response = createCommunication({
            channel: "email",
            status: "sent",
            recipientType: "customer",
            recipientLabel: "Maya Patel",
            customerId: "cust_001",
            subject: "Test opt-out",
            message: "Should be blocked.",
            createdByStaffName: "Staff"
          });
          setResult(response.message);
        }}
      >
        run opt out
      </button>
      {result ? <p role="status">{result}</p> : null}
    </div>
  );
}

describe("Communications hub", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    setStaffSession();
  });

  it("renders message center metrics, notifications, and composer", () => {
    render(
      <TestProviders>
        <TopBar />
        <CommunicationsPage />
      </TestProviders>
    );

    expect(screen.getByRole("heading", { name: "Communications" })).toBeInTheDocument();
    expect(screen.getByText("Sent Today")).toBeInTheDocument();
    expect(screen.getByText("Waiver Reminders Due")).toBeInTheDocument();
    expect(screen.getByText("Message Composer")).toBeInTheDocument();
    expect(screen.getByText("Message Detail")).toBeInTheDocument();
  });

  it("supports searchable recipient selection and send/schedule/draft creation", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <CommunicationsPage />
      </TestProviders>
    );

    await user.selectOptions(screen.getByRole("combobox", { name: "Template" }), "registration_confirmation");
    await user.selectOptions(screen.getByRole("combobox", { name: "Audience" }), "customer");
    await user.type(screen.getByPlaceholderText("Search customer, household, roster, membership"), "maya");
    await user.click(screen.getByRole("button", { name: "Select recipient Maya Patel" }));
    await user.clear(screen.getByLabelText("Subject"));
    await user.type(screen.getByLabelText("Subject"), "Weather closure");
    await user.clear(screen.getByLabelText("Message"));
    await user.type(screen.getByLabelText("Message"), "The facility will open late tomorrow.");
    await user.click(screen.getByRole("button", { name: "Send Now" }));
    expect(screen.getByRole("status")).toHaveTextContent("Message sent.");

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
    await user.selectOptions(screen.getByLabelText("Preferred contact method"), "sms");
    expect(screen.getByLabelText("Preferred contact method")).toHaveValue("sms");
  });

  it("blocks opted-out email sends", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <OptOutHarness />
        <CommunicationsPage />
      </TestProviders>
    );

    await user.click(screen.getByRole("button", { name: "run opt out" }));
    expect(screen.getAllByRole("status").at(-1)).toHaveTextContent("Recipient preferences block this message.");
  });
});
