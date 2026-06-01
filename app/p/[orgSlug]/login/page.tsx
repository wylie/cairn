"use client";

import { use, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CustomerOrgLoginPage({
  params
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const [email, setEmail] = useState("maya.patel@example.com");
  const [password, setPassword] = useState("dev1234");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/customer-login", {
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

      if (next && next.startsWith(`/p/${orgSlug}/`)) router.push(next);
      else router.push(`/p/${orgSlug}/account/dashboard`);
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
          <CardTitle>Customer Portal Login</CardTitle>
          <CardDescription>{orgSlug} customer portal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">Mock customer login for local development.</p>
          <form className="space-y-3" onSubmit={onSubmit}>
            <label className="block space-y-1 text-sm">
              <span>Email</span>
              <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Password</span>
              <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
              Password reset placeholder. Magic links, Google, and Apple login are planned next phases.
            </div>
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
