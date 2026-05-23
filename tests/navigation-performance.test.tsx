import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import PosPage from "@/app/(app)/pos/page";
import { TopBar } from "@/components/layout/top-bar";
import { TestProviders } from "@/tests/test-providers";

describe("Navigation/data initialization performance", () => {
  it("does not repeatedly read localStorage during normal client interactions", async () => {
    const user = userEvent.setup();
    const store = new Map<string, string>();
    const original = window.localStorage;
    const getItemSpy = vi.fn((key: string) => store.get(key) ?? null);

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: getItemSpy,
        setItem: vi.fn((key: string, value: string) => store.set(key, value)),
        removeItem: vi.fn((key: string) => store.delete(key))
      }
    });

    render(
      <TestProviders>
        <TopBar />
        <PosPage />
      </TestProviders>
    );

    const initialReads = getItemSpy.mock.calls.length;
    await user.click(screen.getAllByRole("button", { name: "Switch" })[0]);
    await user.type(screen.getByLabelText("Staff PIN input"), "2222");
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    await user.type(screen.getByLabelText("Search customer"), "Sam");
    await user.keyboard("{ArrowDown}{Enter}");
    await user.click(screen.getByRole("button", { name: "Add Day Pass" }));

    expect(getItemSpy.mock.calls.length).toBe(initialReads);
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: original
    });
  });
});
