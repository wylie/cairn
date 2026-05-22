import type { PosTransaction } from "@/types/domain";
import { formatCurrency } from "@/lib/transactions";

export function MockReceiptPanel({ transaction }: { transaction: PosTransaction | null }) {
  if (!transaction) return null;

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
      <p className="font-medium">Receipt #{transaction.receiptNumber}</p>
      <p>Customer: {transaction.customerName}</p>
      <p>Sold by: {transaction.soldByStaffName ?? "Staff not recorded"}</p>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {transaction.items.map((item) => (
          <li key={`${transaction.id}-${item.productId}`}>
            {item.productName ?? "Unknown item"} x{item.quantity ?? 1} • {formatCurrency(item.lineTotal)}
          </li>
        ))}
      </ul>
      <p className="mt-1">Total: {formatCurrency(transaction.total)}</p>
      <p>{new Date(transaction.completedAt).toLocaleString()}</p>
      <p>{transaction.checkInTriggered ? "Customer checked in" : "Sale completed"}</p>
    </div>
  );
}
