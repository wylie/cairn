import type { PosProduct } from "@/types/domain";

export const productCategoryOptions: Array<PosProduct["category"]> = [
  "day_passes",
  "memberships",
  "punch_passes",
  "classes",
  "camps",
  "retail",
  "comps",
  "misc"
];

export const productTypeOptions: Array<NonNullable<PosProduct["type"]>> = [
  "access",
  "membership",
  "punch-pass",
  "class",
  "camp",
  "retail",
  "comp"
];

export const categoryLabels: Record<string, string> = {
  day_passes: "Day Passes",
  memberships: "Memberships",
  punch_passes: "Punch Passes",
  classes: "Classes",
  camps: "Camps",
  retail: "Retail",
  comps: "Staff Comp",
  misc: "Misc"
};

export const typeLabels: Record<string, string> = {
  access: "Access",
  membership: "Membership",
  "punch-pass": "Punch Pass",
  class: "Class",
  camp: "Camp",
  retail: "Retail",
  comp: "Comp"
};

export const categoryTone: Record<string, string> = {
  day_passes: "bg-sky-50 border-sky-200",
  memberships: "bg-emerald-50 border-emerald-200",
  punch_passes: "bg-amber-50 border-amber-200",
  classes: "bg-violet-50 border-violet-200",
  camps: "bg-orange-50 border-orange-200",
  retail: "bg-slate-50 border-slate-200",
  comps: "bg-slate-100 border-slate-300",
  misc: "bg-slate-50 border-slate-200"
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

export const defaultCategoryColor: Record<PosProduct["category"], ProductColorToken> = {
  day_passes: "blue",
  memberships: "green",
  punch_passes: "amber",
  classes: "purple",
  camps: "orange",
  comps: "gray",
  retail: "slate",
  misc: "slate"
};

export function getProductCategory(product: PosProduct): PosProduct["category"] {
  if (product.category) return product.category;
  if (product.productCategory && productCategoryOptions.includes(product.productCategory as PosProduct["category"])) {
    return product.productCategory as PosProduct["category"];
  }
  return "misc";
}

export function isCompProduct(product: PosProduct) {
  return getProductCategory(product) === "comps" || product.type === "comp";
}

export function resolveProductColorToken(product: PosProduct): ProductColorToken {
  if (product.colorToken) return product.colorToken;
  if (product.categoryColorToken && product.categoryColorToken in colorTokenLabels) {
    return product.categoryColorToken as ProductColorToken;
  }
  return defaultCategoryColor[getProductCategory(product)];
}

export function getProductToneClass(product: PosProduct) {
  return colorTokenTone[resolveProductColorToken(product)];
}
