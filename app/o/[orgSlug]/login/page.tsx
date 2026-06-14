"use client";

import { Suspense, use, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const demoAccountsByOrg: Record<string, Array<{ label: string; email: string; pin: string }>> = {
  summit: [
    { label: "Owner", email: "taylor@summitrec.co", pin: "1111" },
    { label: "Manager", email: "maya@summitrec.co", pin: "2222" },
    { label: "Front Desk", email: "sam@summitrec.co", pin: "3333" },
    { label: "Instructor", email: "iris@summitrec.co", pin: "8888" }
  ],
  riverbend: [
    { label: "Owner", email: "owner@riverbend.example", pin: "Use password login" }
  ]
};

function StaffOrgLoginContent({
  params
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams?.get?.("next");
  const isDevelopment = process.env.NODE_ENV !== "production";
  const demoAccounts = demoAccountsByOrg[orgSlug] ?? [];
  const [email, setEmail] = useState(demoAccounts[0]?.email ?? "");
  const [password, setPassword] = useState("dev1234");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const defaultTarget = useMemo(() => `/o/${orgSlug}/dashboard`, [orgSlug]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/mock-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, orgSlug })
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.message ?? "Unable to sign in.");
        return;
      }

      if (next && next.startsWith(`/o/${orgSlug}/`)) router.push(next);
      else router.push(defaultTarget);
      router.refresh();
    } catch {
      setError("Unable to sign in.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center p-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Staff Login</CardTitle>
          <CardDescription>{orgSlug} staff portal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">Mock login for local development.</p>
          {isDevelopment && demoAccounts.length > 0 ? (
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
              <p className="font-medium">Demo accounts for this facility</p>
              <ul className="mt-2 space-y-1">
                {demoAccounts.map((account) => (
                  <li key={account.email}>
                    <span className="font-medium">{account.label}:</span> {account.email} / dev1234
                    {account.pin !== "Use password login" ? ` (PIN ${account.pin})` : ""}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sky-800">
                Password signs into Cairn. Staff PIN is used for quick workstation switching and manager approval.
              </p>
            </div>
          ) : null}
          <form className="space-y-3" onSubmit={onSubmit}>
            <label className="block space-y-1 text-sm">
              <span>Email</span>
              <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Password</span>
              <Input value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
            </label>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button className="w-full" type="submit" disabled={pending}>
              {pending ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function StaffOrgLoginPage({
  params
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  return (
    <Suspense fallback={<div className="mx-auto flex min-h-screen max-w-md items-center p-4 text-sm text-muted-foreground">Loading staff login…</div>}>
      <StaffOrgLoginContent params={params} />
    </Suspense>
  );
}
