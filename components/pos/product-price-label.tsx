export function ProductPriceLabel({ cents }: { cents: number }) {
  return <span className="text-sm font-medium">${(cents / 100).toFixed(2)}</span>;
}
