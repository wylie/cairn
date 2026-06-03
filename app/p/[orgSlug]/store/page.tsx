"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerPortalContainer } from "@/components/portal/customer-portal-container";
import { useCustomerPortalData } from "@/lib/portal/use-customer-portal-data";
import { usePublicCart } from "@/lib/public-cart";
import { formatCurrency } from "@/lib/transactions";

const TABS = [
  { key: "memberships", label: "Memberships" },
  { key: "passes", label: "Passes" },
  { key: "retail", label: "Retail" },
  { key: "rentals", label: "Rentals" },
  { key: "gift_cards", label: "Gift Cards" }
] as const;

export default function PublicStorePage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const { accessProducts, primaryCustomerId } = useCustomerPortalData();
  const { addProductItem } = usePublicCart();

  const groups = useMemo(() => ({
    memberships: accessProducts.filter((entry) => entry.active && (entry.category === "memberships" || entry.type === "membership")),
    passes: accessProducts.filter((entry) => entry.active && (entry.category === "day_passes" || entry.category === "punch_passes")),
    retail: accessProducts.filter((entry) => entry.active && entry.category === "retail" && entry.type !== "rental" && entry.type !== "gift-card"),
    rentals: accessProducts.filter((entry) => entry.active && entry.type === "rental"),
    gift_cards: accessProducts.filter((entry) => entry.active && entry.type === "gift-card")
  }), [accessProducts]);

  return (
    <CustomerPortalContainer>
      <section className="space-y-4" data-testid="public-store-page">
        <div className="rounded-xl border bg-card p-4">
          <h1 className="text-2xl font-semibold">Memberships, Passes & Retail</h1>
          <p className="text-sm text-muted-foreground">Add memberships, day passes, punch passes, rentals, and retail products to a shared online cart.</p>
        </div>
        {TABS.map((tab) => (
          <div key={tab.key} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">{tab.label}</h2>
              <Link href={`/p/${orgSlug}/checkout`} className="text-sm text-primary underline">Go to checkout</Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {groups[tab.key].map((product) => (
                <Card key={product.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{product.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <p className="text-muted-foreground">{product.description}</p>
                    <p>{formatCurrency((product.nonMemberPriceCents ?? product.priceCents) / 100)}</p>
                    <Button
                      className="min-h-11"
                      onClick={() => {
                        addProductItem({ productId: product.id, participantCustomerId: primaryCustomerId });
                        router.push(`/p/${orgSlug}/checkout`);
                      }}
                    >
                      Add to Cart
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </section>
    </CustomerPortalContainer>
  );
}
