import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/auth/mock-login/route";
import { AUTH_COOKIE } from "@/lib/auth/session";

function loginRequest(body: Record<string, string>) {
  return new Request("http://localhost/api/auth/mock-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("facility-scoped staff login", () => {
  it("rejects a valid staff account from another organization without creating a session", async () => {
    const response = await POST(loginRequest({
      email: "owner@riverbend.example",
      password: "dev1234",
      orgSlug: "summit"
    }));

    expect(response.status).toBe(403);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("creates a session for a staff account assigned to the requested organization", async () => {
    const response = await POST(loginRequest({
      email: "owner@riverbend.example",
      password: "dev1234",
      orgSlug: "riverbend"
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain(AUTH_COOKIE);
  });
});
