"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { parseOrgSlugFromPathname } from "@/lib/tenant/path";

export type PublicCartItem = {
  id: string;
  kind: "session" | "product";
  sessionId?: string;
  programId?: string;
  productId?: string;
  participantCustomerId?: string;
  quantity: number;
};

type PublicCartContextValue = {
  items: PublicCartItem[];
  promoCode: string;
  addSessionItem: (item: { sessionId: string; programId: string; participantCustomerId?: string }) => void;
  addProductItem: (item: { productId: string; participantCustomerId?: string; quantity?: number }) => void;
  updateItem: (itemId: string, updates: Partial<Pick<PublicCartItem, "participantCustomerId" | "quantity">>) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  setPromoCode: (code: string) => void;
};

const PublicCartContext = createContext<PublicCartContextValue | null>(null);

function buildStorageKey(orgSlug: string) {
  return `cairn_public_cart_${orgSlug}`;
}

export function PublicCartProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/p/summit";
  const orgSlug = parseOrgSlugFromPathname(pathname) ?? "summit";
  const [items, setItems] = useState<PublicCartItem[]>([]);
  const [promoCode, setPromoCodeState] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(buildStorageKey(orgSlug));
    if (!raw) {
      setItems([]);
      setPromoCodeState("");
      setHydrated(true);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as { items?: PublicCartItem[]; promoCode?: string };
      setItems(Array.isArray(parsed.items) ? parsed.items : []);
      setPromoCodeState(typeof parsed.promoCode === "string" ? parsed.promoCode : "");
    } catch {
      setItems([]);
      setPromoCodeState("");
    }
    setHydrated(true);
  }, [orgSlug]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(buildStorageKey(orgSlug), JSON.stringify({ items, promoCode }));
  }, [hydrated, items, orgSlug, promoCode]);

  const value = useMemo<PublicCartContextValue>(() => ({
    items,
    promoCode,
    addSessionItem: ({ sessionId, programId, participantCustomerId }) => {
      setItems((prev) => {
        const existing = prev.find((item) => item.kind === "session" && item.sessionId === sessionId && item.participantCustomerId === participantCustomerId);
        if (existing) return prev;
        return [
          ...prev,
          {
            id: `cart_${Math.random().toString(36).slice(2, 9)}`,
            kind: "session",
            sessionId,
            programId,
            participantCustomerId,
            quantity: 1
          }
        ];
      });
    },
    addProductItem: ({ productId, participantCustomerId, quantity = 1 }) => {
      setItems((prev) => {
        const existing = prev.find((item) => item.kind === "product" && item.productId === productId && item.participantCustomerId === participantCustomerId);
        if (existing) {
          return prev.map((item) =>
            item.id === existing.id ? { ...item, quantity: item.quantity + quantity } : item
          );
        }
        return [
          ...prev,
          {
            id: `cart_${Math.random().toString(36).slice(2, 9)}`,
            kind: "product",
            productId,
            participantCustomerId,
            quantity
          }
        ];
      });
    },
    updateItem: (itemId, updates) => {
      setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item)));
    },
    removeItem: (itemId) => {
      setItems((prev) => prev.filter((item) => item.id !== itemId));
    },
    clearCart: () => {
      setItems([]);
      setPromoCodeState("");
    },
    setPromoCode: (code) => setPromoCodeState(code.trim().toUpperCase())
  }), [items, promoCode]);

  return <PublicCartContext.Provider value={value}>{children}</PublicCartContext.Provider>;
}

export function usePublicCart() {
  const context = useContext(PublicCartContext);
  if (!context) throw new Error("usePublicCart must be used within PublicCartProvider");
  return context;
}
