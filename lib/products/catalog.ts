import type { PosProduct } from "@/types/domain";

export const productCategoryOptions: string[] = [
  "day_passes",
  "memberships",
  "punch_passes",
  "classes",
  "camps",
  "rentals",
  "retail",
  "comps",
  "other"
];

export const productTypeOptions: Array<NonNullable<PosProduct["type"]>> = [
  "access",
  "membership",
  "punch-pass",
  "class",
  "camp",
  "registration",
  "retail",
  "comp"
];

export const categoryLabels: Record<string, string> = {
  day_passes: "Day Passes",
  memberships: "Memberships",
  punch_passes: "Punch Passes",
  classes: "Classes",
  camps: "Camps",
  rentals: "Rentals",
  retail: "Retail",
  comps: "Comps",
  misc: "Other",
  other: "Other",
  uncategorized: "Uncategorized"
};

export const typeLabels: Record<string, string> = {
  access: "Day Pass",
  membership: "Membership",
  "punch-pass": "Punch Pass",
  class: "Class Pass",
  camp: "Camp",
  registration: "Registration",
  retail: "Retail",
  comp: "Comp"
};

export const productColorTokens = ["blue", "green", "amber", "purple", "orange", "slate", "gray", "red"] as const;
export type ProductColorToken = (typeof productColorTokens)[number];

export const colorTokenLabels: Record<ProductColorToken, string> = {
  blue: "Blue",
  green: "Green",
  amber: "Amber",
  purple: "Purple",
  orange: "Orange",
  slate: "Slate",
  gray: "Gray",
  red: "Red"
};

export const colorTokenTone: Record<ProductColorToken, string> = {
  blue: "bg-sky-50 border-sky-200 hover:bg-sky-100",
  green: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100",
  amber: "bg-amber-50 border-amber-200 hover:bg-amber-100",
  purple: "bg-violet-50 border-violet-200 hover:bg-violet-100",
  orange: "bg-orange-50 border-orange-200 hover:bg-orange-100",
  slate: "bg-slate-50 border-slate-200 hover:bg-slate-100",
  gray: "bg-zinc-100 border-zinc-300 hover:bg-zinc-200",
  red: "bg-rose-50 border-rose-200 hover:bg-rose-100"
};

export const defaultCategoryColor: Record<string, ProductColorToken> = {
  day_passes: "blue",
  memberships: "green",
  punch_passes: "amber",
  classes: "purple",
  camps: "orange",
  rentals: "slate",
  comps: "gray",
  retail: "slate",
  other: "slate",
  misc: "slate",
  uncategorized: "slate"
};

export function getProductCategory(product: PosProduct): string {
  if (product.productCategory?.trim()) return product.productCategory.trim();
  if (product.category?.trim()) return product.category.trim();
  return "uncategorized";
}

export function isCompProduct(product: PosProduct) {
  return getProductCategory(product) === "comps" || product.type === "comp";
}

export function resolveProductColorToken(product: PosProduct): ProductColorToken {
  if (product.colorToken) return product.colorToken;
  if (product.categoryColorToken && product.categoryColorToken in colorTokenLabels) {
    return product.categoryColorToken as ProductColorToken;
  }
  return defaultCategoryColor[getProductCategory(product)] ?? "slate";
}

export function getProductToneClass(product: PosProduct) {
  return colorTokenTone[resolveProductColorToken(product)];
}

export function mapTypeToCategory(type: PosProduct["type"]): string {
  switch (type) {
    case "membership":
      return "memberships";
    case "punch-pass":
      return "punch_passes";
    case "class":
    case "registration":
      return "classes";
    case "camp":
      return "camps";
    case "retail":
      return "retail";
    case "comp":
      return "comps";
    case "access":
    default:
      return "day_passes";
  }
}
