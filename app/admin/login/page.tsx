"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CairnBrand } from "@/components/brand/cairn-brand";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function PlatformAdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams?.get?.("next");
  const defaultTarget = useMemo(() => "/admin", []);
  const [email, setEmail] = useState("platform@cairn.app");
  const [password, setPassword] = useState("dev1234");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

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
      if (!["platform_admin", "support_staff"].includes(payload.user?.kind ?? "")) {
        setError("This account is not authorized for Cairn platform or support access.");
        return;
      }
      const fallbackTarget = payload.user?.kind === "support_staff" ? "/admin/support" : defaultTarget;
      router.push(next && next.startsWith("/admin") ? next : fallbackTarget);
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
          <CairnBrand className="mb-3 h-11 w-11" />
          <CardTitle>Platform Admin Login</CardTitle>
          <CardDescription>Authenticate into Cairn platform administration or the support console.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
            <p className="font-medium">Demo credentials</p>
            <p className="mt-2">Platform Admin: platform@cairn.app / dev1234</p>
            <p className="mt-1">Support Staff: support@cairn.app / dev1234</p>
          </div>
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

export default function PlatformAdminLoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto flex min-h-screen max-w-md items-center p-4 text-sm text-muted-foreground">Loading platform login…</div>}>
      <PlatformAdminLoginContent />
    </Suspense>
  );
}
