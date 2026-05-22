import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { TopBar } from "@/components/layout/top-bar";
import { buildScopedMockKey } from "@/lib/mock-storage";
import { TestProviders } from "@/tests/test-providers";

describe("Workstation persistence", () => {
  it("restores active staff from local storage on refresh", async () => {
    const store = new Map<string, string>();
    const originalLocalStorage = window.localStorage;

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) => store.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
          store.set(key, value);
        }),
        removeItem: vi.fn((key: string) => {
          store.delete(key);
        })
      }
    });

    window.localStorage.setItem(buildScopedMockKey("org_summit", "loc_001", "activeStaff"), JSON.stringify("staff_002"));

    render(
      <TestProviders>
        <TopBar />
      </TestProviders>
    );

    expect(await screen.findByText(/Maya Lopez/i)).toBeInTheDocument();

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: originalLocalStorage
    });
  });
});
