"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CustomerLoginPage() {
  const router = useRouter();
  const next = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null;
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
      if (next && next.startsWith("/p/")) router.push(next);
      else router.push(`/p/${payload.user?.organizations?.[0] ?? "summit"}/dashboard`);
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
          <CardDescription>Access memberships, programs, waivers, and household details.</CardDescription>
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
            <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">Password reset placeholder. Magic links, Google, and Apple login are planned next phases.</div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button className="w-full" type="submit" disabled={pending}>{pending ? "Signing in..." : "Sign in"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
