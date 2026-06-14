import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildSeedProvisionedOrganizations, ORG_REGISTRY_STORAGE_KEY } from "@/lib/platform-admin/registry";
import { useRuntimeOrganizations } from "@/lib/platform-admin/use-runtime-organizations";

function OrganizationOptions() {
  const organizations = useRuntimeOrganizations();
  return (
    <select aria-label="Organizations">
      {organizations.map((organization) => (
        <option key={organization.id} value={organization.slug}>{organization.name}</option>
      ))}
    </select>
  );
}

describe("runtime organization hydration", () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

  beforeEach(() => {
    consoleError.mockClear();
    window.localStorage.clear();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  afterAll(() => {
    consoleError.mockRestore();
  });

  it("uses deterministic demo organization options across server and client hydration", async () => {
    const riverstone = buildSeedProvisionedOrganizations().find((entry) => entry.slug === "riverbend")!;
    window.localStorage.setItem(
      ORG_REGISTRY_STORAGE_KEY,
      JSON.stringify([{ ...riverstone, name: "Riverbend Recreation Collective" }])
    );

    const container = document.createElement("div");
    container.innerHTML = renderToString(<OrganizationOptions />);
    document.body.appendChild(container);

    const root = hydrateRoot(container, <OrganizationOptions />);
    await waitFor(() => expect(container).toHaveTextContent("Riverstone Nature Center"));

    expect(container).not.toHaveTextContent("Riverbend Recreation Collective");
    expect(consoleError.mock.calls.flat().join(" ")).not.toMatch(/hydration|did not match/i);

    await act(async () => root.unmount());
  });
});
