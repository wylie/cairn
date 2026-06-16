import type { Metadata } from "next";
import Link from "next/link";
import { CairnBrand } from "@/components/brand/cairn-brand";

export const metadata: Metadata = {
  title: "Legal | Cairn",
  description: "Legal ownership and attribution for Cairn."
};

export default function LegalPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-14 text-slate-900 md:px-10">
      <Link href="/" className="text-sm font-medium text-sky-700 hover:underline">
        Back to Cairn
      </Link>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <CairnBrand variant="wordmark" className="h-12 w-auto" />
        <h1 className="mt-3 text-3xl font-semibold">Legal</h1>
        <div className="mt-6 space-y-3 text-slate-700">
          <p>Cairn is facility operations software built by Argon Collective LLC.</p>
          <p>Cairn is the primary product brand for modern recreation facility operations.</p>
          <p>© 2026 Argon Collective LLC. All rights reserved.</p>
        </div>
      </section>
    </main>
  );
}
