"use client";

import { Suspense, use, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [email, setEmail] = useState("taylor@summitrec.co");
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
        body: JSON.stringify({ email, password })
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setError(payload.message ?? "Unable to sign in.");
        return;
      }

      const orgs: string[] = payload.user?.organizations ?? [];
      if (!orgs.includes(orgSlug)) {
        setError(`This account is not assigned to ${orgSlug}.`);
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
          {isDevelopment ? (
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
              <p className="font-medium">Demo accounts</p>
              <ul className="mt-2 space-y-1">
                <li><span className="font-medium">Owner:</span> taylor@summitrec.co / dev1234 (PIN 1111)</li>
                <li><span className="font-medium">Manager:</span> maya@summitrec.co / dev1234 (PIN 2222)</li>
                <li><span className="font-medium">Front Desk:</span> sam@summitrec.co / dev1234 (PIN 3333)</li>
                <li><span className="font-medium">Instructor:</span> iris@summitrec.co / dev1234 (PIN 8888)</li>
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
