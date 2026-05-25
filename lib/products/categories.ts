import type { ProductCategoryRecord } from "@/types/domain";

const SYSTEM_CATEGORY_DEFS: Array<{ key: string; label: string; colorToken: ProductCategoryRecord["colorToken"] }> = [
  { key: "memberships", label: "Memberships", colorToken: "green" },
  { key: "day_passes", label: "Day Passes", colorToken: "blue" },
  { key: "punch_passes", label: "Punch Passes", colorToken: "amber" },
  { key: "classes", label: "Classes", colorToken: "purple" },
  { key: "camps", label: "Camps", colorToken: "orange" },
  { key: "rentals", label: "Rentals", colorToken: "slate" },
  { key: "retail", label: "Retail", colorToken: "gray" },
  { key: "comps", label: "Comps", colorToken: "red" },
  { key: "other", label: "Other", colorToken: "slate" }
];

export function buildSystemProductCategories(organizationId: string): ProductCategoryRecord[] {
  return SYSTEM_CATEGORY_DEFS.map((entry, index) => ({
    id: `cat_${organizationId}_${entry.key}`,
    organizationId,
    key: entry.key,
    label: entry.label,
    colorToken: entry.colorToken,
    displayOrder: index,
    isSystem: true,
    active: true
  }));
}

export function normalizeCategoryKey(input: string): string {
  return input.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "other";
}
