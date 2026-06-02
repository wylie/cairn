import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsPage from "@/app/(app)/settings/page";
import { TopBar } from "@/components/layout/top-bar";
import { AppShell } from "@/components/layout/app-shell";
import { TestProviders } from "@/tests/test-providers";
import { vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/settings"
}));

async function switchStaff(user: ReturnType<typeof userEvent.setup>, pin: string) {
  await user.click(screen.getByRole("button", { name: "Switch" }));
  await user.type(screen.getByLabelText("Staff PIN input"), pin);
  await user.click(screen.getByRole("button", { name: "Confirm" }));
}

describe("Settings system MVP", () => {
  it("creates and edits locations", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <SettingsPage />
      </TestProviders>
    );

    await switchStaff(user, "1111");
    await user.click(screen.getByRole("button", { name: "Locations" }));
    await user.click(screen.getByRole("button", { name: "Add Location" }));

    const dialog = screen.getByRole("dialog", { name: "Add Location" });
    await user.type(within(dialog).getByLabelText("Location name"), "Summit East");
    await user.type(within(dialog).getByLabelText("City"), "Brooklyn");
    await user.type(within(dialog).getByLabelText("State"), "NY");
    await user.click(within(dialog).getByRole("button", { name: "Add Location" }));

    expect(await screen.findByText("Summit East")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Edit location" }).at(-1)!);
    const editDialog = screen.getByRole("dialog", { name: "Edit Location" });
    const shortCode = within(editDialog).getByLabelText("Internal short code");
    await user.clear(shortCode);
    await user.type(shortCode, "EAST");
    await user.click(within(editDialog).getByRole("button", { name: "Save Location" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Location updated");
  });

  it("archives location through confirmation modal", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <SettingsPage />
      </TestProviders>
    );
    await switchStaff(user, "1111");
    await user.click(screen.getByRole("button", { name: "Locations" }));
    await user.click(screen.getByRole("button", { name: "Add Location" }));
    const addDialog = screen.getByRole("dialog", { name: "Add Location" });
    await user.type(within(addDialog).getByLabelText("Location name"), "Archive Target");
    await user.type(within(addDialog).getByLabelText("City"), "Queens");
    await user.type(within(addDialog).getByLabelText("State"), "NY");
    await user.click(within(addDialog).getByRole("button", { name: "Add Location" }));

    await user.click(screen.getAllByRole("button", { name: "Archive" }).at(-1)!);
    const dialog = screen.getByRole("dialog", { name: "Archive location confirmation" });
    await user.click(within(dialog).getByRole("button", { name: "Archive Location" }));
    expect(await screen.findByRole("status")).toBeInTheDocument();
  });

  it("supports custom role creation and duplication", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <SettingsPage />
      </TestProviders>
    );
    await switchStaff(user, "1111");
    await user.click(screen.getByRole("button", { name: "Staff Roles" }));
    await user.click(screen.getByRole("button", { name: "Create Role" }));
    const dialog = screen.getByRole("dialog", { name: "Create Role" });
    await user.type(within(dialog).getByLabelText("Role name"), "Camp Counselor");
    await user.type(within(dialog).getByLabelText("Description"), "Supports youth camp check-ins.");
    const colorSelect = within(dialog).getByRole("combobox");
    await user.selectOptions(colorSelect, "purple");
    expect(colorSelect).toHaveValue("purple");
    await user.click(within(dialog).getByLabelText("Check in customers"));
    await user.click(within(dialog).getByRole("button", { name: "Create Role" }));
    expect(await screen.findByText("Camp Counselor")).toBeInTheDocument();

    const duplicateButtons = screen.getAllByRole("button", { name: "Duplicate role" });
    await user.click(duplicateButtons[duplicateButtons.length - 1]);
    expect(await screen.findByRole("status")).toHaveTextContent("Role duplicated");
  });

  it("protects owner role from dangerous permission removal and archive", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <SettingsPage />
      </TestProviders>
    );
    await switchStaff(user, "1111");
    await user.click(screen.getByRole("button", { name: "Staff Roles" }));
    await user.click(screen.getAllByRole("button", { name: "Edit role" })[0]);
    const dialog = screen.getByRole("dialog", { name: "Edit Role" });
    const manageSettingsPermission = within(dialog).getByLabelText("Manage settings");
    await user.click(manageSettingsPermission);
    await user.click(within(dialog).getByRole("button", { name: "Save Role" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Owner role must retain core owner permissions");
  });

  it("warns about unsaved changes when switching settings section", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <SettingsPage />
      </TestProviders>
    );
    await switchStaff(user, "1111");
    const facilityName = screen.getByLabelText("Facility/business name");
    await user.clear(facilityName);
    await user.type(facilityName, "Summit Rec Updated");
    await user.click(screen.getByRole("button", { name: "Locations" }));
    expect(screen.getByRole("dialog", { name: "Unsaved changes warning" })).toBeInTheDocument();
  });

  it("saves facility settings and clears dirty state", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <SettingsPage />
      </TestProviders>
    );
    await switchStaff(user, "1111");
    const legalName = screen.getByLabelText("Legal business name");
    const saveButton = screen.getByRole("button", { name: "Save Facility Settings" });
    expect(saveButton).toBeDisabled();
    await user.clear(legalName);
    await user.type(legalName, "Summit Testing LLC");
    expect(saveButton).toBeEnabled();
    await user.click(saveButton);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Facility settings saved"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Save Facility Settings" })).toBeDisabled());
  });

  it("renders and saves global date/time formatting settings", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <SettingsPage />
      </TestProviders>
    );
    await switchStaff(user, "1111");

    const dateFormat = screen.getByLabelText("Date format");
    const timeFormat = screen.getByLabelText("Time format");

    expect(dateFormat).toHaveValue("MM/DD/YYYY");
    expect(timeFormat).toHaveValue("12-hour");

    await user.selectOptions(dateFormat, "DD/MM/YYYY");
    await user.selectOptions(timeFormat, "24-hour");
    await user.click(screen.getByRole("button", { name: "Save Facility Settings" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Facility settings saved"));
    expect(screen.getByLabelText("Date format")).toHaveValue("DD/MM/YYYY");
    expect(screen.getByLabelText("Time format")).toHaveValue("24-hour");
  });

  it("closes modals with Escape and outside click", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <SettingsPage />
      </TestProviders>
    );
    await switchStaff(user, "1111");
    await user.click(screen.getByRole("button", { name: "Locations" }));
    await user.click(screen.getByRole("button", { name: "Add Location" }));
    expect(screen.getByRole("dialog", { name: "Add Location" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Add Location" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add Location" }));
    const dialog = screen.getByRole("dialog", { name: "Add Location" });
    await user.click(within(dialog).getByLabelText("Location name"));
    expect(screen.getByRole("dialog", { name: "Add Location" })).toBeInTheDocument();
    await user.click(screen.getByRole("dialog", { name: "Add Location" }));
    expect(screen.queryByRole("dialog", { name: "Add Location" })).not.toBeInTheDocument();
  });

  it("keeps Settings nav visible for permitted roles", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <AppShell>
          <div>content</div>
        </AppShell>
      </TestProviders>
    );
    await switchStaff(user, "2222");
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
  });

  it("shows distinct Staff Roles and Permissions content", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <SettingsPage />
      </TestProviders>
    );
    await switchStaff(user, "1111");
    await user.click(screen.getByRole("button", { name: "Staff Roles" }));
    expect(screen.getByRole("button", { name: "Create Role" })).toBeInTheDocument();
    expect(screen.queryByText("Reference matrix for what each permission allows in day-to-day operations.")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Permissions" }));
    expect(screen.getByText("Reference matrix for what each permission allows in day-to-day operations.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create Role" })).not.toBeInTheDocument();
  });

  it("renders closeout and calendar default controls in system controls", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <SettingsPage />
      </TestProviders>
    );
    await switchStaff(user, "1111");
    await user.click(screen.getByRole("button", { name: "System Controls" }));
    expect(screen.getByLabelText("Facility is open 24/7")).toBeInTheDocument();
    expect(screen.getByLabelText("Default closeout time")).toBeInTheDocument();
    expect(screen.getByLabelText("Auto check-out active visitors at closeout")).toBeInTheDocument();
    expect(screen.getByLabelText("Default calendar view")).toBeInTheDocument();
  });

  it("renders human-readable permissions and hides raw permission keys", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <SettingsPage />
      </TestProviders>
    );
    await switchStaff(user, "1111");
    await user.click(screen.getByRole("button", { name: "Permissions" }));

    expect(screen.getByText("Grant comp access")).toBeInTheDocument();
    expect(screen.getByText("Override access rules")).toBeInTheDocument();
    expect(screen.getByText("Use POS")).toBeInTheDocument();

    expect(screen.queryByText("compAccess")).not.toBeInTheDocument();
    expect(screen.queryByText("overrideAccess")).not.toBeInTheDocument();
    expect(screen.queryByText("usePOS")).not.toBeInTheDocument();
  });

  it("supports logo and favicon upload previews", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <SettingsPage />
      </TestProviders>
    );
    await switchStaff(user, "1111");
    await user.click(screen.getByRole("button", { name: "Branding" }));

    expect(screen.getByLabelText("Primary brand color picker")).toBeInTheDocument();
    expect(screen.getByLabelText("Secondary brand color picker")).toBeInTheDocument();

    const logoInput = screen.getByLabelText("Upload logo", { selector: "input" }) as HTMLInputElement;
    const faviconInput = screen.getByLabelText("Upload favicon", { selector: "input" }) as HTMLInputElement;
    const logoFile = new File(["logo"], "logo.png", { type: "image/png" });
    const faviconFile = new File(["icon"], "favicon.png", { type: "image/png" });
    await user.upload(logoInput, logoFile);
    await user.upload(faviconInput, faviconFile);

    expect(await screen.findByAltText("Logo preview")).toBeInTheDocument();
    expect(await screen.findByAltText("Favicon preview")).toBeInTheDocument();
    expect(screen.queryByLabelText("Logo URL (fallback)")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Favicon URL (fallback)")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Dark mode logo URL (fallback)")).not.toBeInTheDocument();
  });

  it("renders waiver roadmap and payment processor planning panels", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <SettingsPage />
      </TestProviders>
    );
    await switchStaff(user, "1111");
    await user.click(screen.getByRole("button", { name: "Waivers" }));
    expect(screen.getByText("Waiver builder and digital signing will be added in a future phase.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "POS & Payments" }));
    expect(screen.getByText("Status:")).toBeInTheDocument();
    expect(screen.getByText("Not connected")).toBeInTheDocument();
    expect(screen.getByText("Card payments require a payment processor connection.")).toBeInTheDocument();
  });

  it("renders notification categories and renamed system controls language", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <SettingsPage />
      </TestProviders>
    );
    await switchStaff(user, "1111");
    await user.click(screen.getByRole("button", { name: "Notifications" }));
    expect(screen.getByText("Customer notifications")).toBeInTheDocument();
    expect(screen.getByText("Staff notifications")).toBeInTheDocument();
    expect(screen.getByText("Admin notifications")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "System Controls" }));
    expect(screen.getByRole("heading", { name: "System Controls" })).toBeInTheDocument();
    expect(screen.getByText("Enforce role permissions")).toBeInTheDocument();
    expect(screen.getByText("When enabled, staff can only access actions allowed by their assigned role.")).toBeInTheDocument();
  });

  it("keeps role color as controlled dropdown (not color picker)", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <SettingsPage />
      </TestProviders>
    );
    await switchStaff(user, "1111");
    await user.click(screen.getByRole("button", { name: "Staff Roles" }));
    await user.click(screen.getByRole("button", { name: "Create Role" }));
    const dialog = screen.getByRole("dialog", { name: "Create Role" });
    const colorSelect = within(dialog).getByRole("combobox");
    expect(colorSelect).toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Color picker")).not.toBeInTheDocument();
  });

  it("uses timezone dropdown and removes logo URL from Facility Profile", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <SettingsPage />
      </TestProviders>
    );
    await switchStaff(user, "1111");
    const timezone = screen.getByLabelText("Timezone");
    expect(timezone.tagName.toLowerCase()).toBe("select");
    expect(screen.queryByLabelText("Logo URL")).not.toBeInTheDocument();
  });

  it("location cards render scannable detail list layout", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <SettingsPage />
      </TestProviders>
    );
    await switchStaff(user, "1111");
    await user.click(screen.getByRole("button", { name: "Locations" }));
    const detailList = screen.getAllByTestId("location-detail-list")[0];
    expect(within(detailList).getByText("Capacity")).toBeInTheDocument();
    expect(within(detailList).getByText("Check-in")).toBeInTheDocument();
    expect(within(detailList).getByText("Address")).toBeInTheDocument();
  });

  it("add location uses timezone dropdown and staff with access label", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <SettingsPage />
      </TestProviders>
    );
    await switchStaff(user, "1111");
    await user.click(screen.getByRole("button", { name: "Locations" }));
    await user.click(screen.getByRole("button", { name: "Add Location" }));
    const dialog = screen.getByRole("dialog", { name: "Add Location" });
    const timezone = within(dialog).getByLabelText("Timezone override");
    expect(timezone.tagName.toLowerCase()).toBe("select");
    expect(within(dialog).getByText("Staff with access")).toBeInTheDocument();
  });

  it("system roles cannot be deleted and custom role can be deleted when unused", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <SettingsPage />
      </TestProviders>
    );
    await switchStaff(user, "1111");
    await user.click(screen.getByRole("button", { name: "Staff Roles" }));
    const ownerCard = screen.getByText("Owner").closest(".rounded-lg") as HTMLElement;
    expect(within(ownerCard).queryByRole("button", { name: "Delete role" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Create Role" }));
    const dialog = screen.getByRole("dialog", { name: "Create Role" });
    await user.type(within(dialog).getByLabelText("Role name"), "Temp Role");
    await user.click(within(dialog).getByRole("button", { name: "Create Role" }));
    const roleCard = (await screen.findByText("Temp Role")).closest(".rounded-lg") as HTMLElement;
    const deleteButton = within(roleCard).getByRole("button", { name: "Delete role" });
    expect(deleteButton).toBeInTheDocument();
    await user.click(deleteButton);
    await user.click(screen.getByRole("button", { name: "Delete Role" }));
    expect(await screen.findByRole("status")).toHaveTextContent("deleted");
  });

  it("archive role uses subtle destructive variant and role color chip reflects selected color", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <SettingsPage />
      </TestProviders>
    );
    await switchStaff(user, "1111");
    await user.click(screen.getByRole("button", { name: "Staff Roles" }));
    await user.click(screen.getByRole("button", { name: "Create Role" }));
    const firstDialog = screen.getByRole("dialog", { name: "Create Role" });
    await user.type(within(firstDialog).getByLabelText("Role name"), "Archive Test Role");
    await user.click(within(firstDialog).getByRole("button", { name: "Create Role" }));
    const customRoleArchiveButton = (await screen.findAllByRole("button", { name: "Archive role" })).at(0) as HTMLElement;
    expect(customRoleArchiveButton.className).toContain("border-rose");

    await user.click(screen.getByRole("button", { name: "Create Role" }));
    const dialog = screen.getByRole("dialog", { name: "Create Role" });
    await user.selectOptions(within(dialog).getByRole("combobox"), "amber");
    const amberChip = within(dialog).getAllByText("Amber").find((el) => el.className.includes("border-amber"));
    expect(amberChip).toBeTruthy();
  });

  it("removes Membership Products from Settings navigation", async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <TopBar />
        <SettingsPage />
      </TestProviders>
    );
    await switchStaff(user, "1111");
    expect(screen.queryByRole("button", { name: "Membership Products" })).not.toBeInTheDocument();
  });
});
