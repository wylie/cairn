import { cn } from "@/lib/utils";

type CairnBrandProps = {
  variant?: "mark" | "wordmark";
  className?: string;
};

export function CairnBrand({ variant = "mark", className }: CairnBrandProps) {
  const src = variant === "wordmark" ? "/branding/cairn-wordmark.svg" : "/branding/cairn-mark.svg";
  const alt = variant === "wordmark" ? "Cairn" : "Cairn mark";

  return <img src={src} alt={alt} className={cn("block shrink-0", className)} />;
}
