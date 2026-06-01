import type { PosTransaction } from "@/types/domain";

export function canCustomerViewReceipt(transaction: PosTransaction, visibleCustomerIds: string[]) {
  if (visibleCustomerIds.length === 0) return false;
  const visible = new Set(visibleCustomerIds);

  if (transaction.customerId && visible.has(transaction.customerId)) return true;
  if (transaction.purchaserCustomerId && visible.has(transaction.purchaserCustomerId)) return true;
  if ((transaction.purchasedForCustomerIds ?? []).some((id) => visible.has(id))) return true;

  return false;
}

export function getReceiptStatus(transaction: PosTransaction): NonNullable<PosTransaction["receiptStatus"]> {
  if (transaction.receiptStatus) return transaction.receiptStatus;
  if (transaction.paymentType === "comp") return "comped";
  if (transaction.transactionType === "return") return "refunded";
  if (transaction.returnStatus === "fully_returned") return "refunded";
  if (transaction.returnStatus === "partially_returned") return "partially_refunded";
  return "paid";
}

export function getReceiptStatusLabel(status: NonNullable<PosTransaction["receiptStatus"]>) {
  switch (status) {
    case "paid":
      return "Paid";
    case "pending":
      return "Pending";
    case "refunded":
      return "Refunded";
    case "partially_refunded":
      return "Partially Refunded";
    case "voided":
      return "Voided";
    case "comped":
      return "Comped";
    default:
      return "Paid";
  }
}

