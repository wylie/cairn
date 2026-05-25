"use client";

import { ProductFormModal } from "@/components/products/product-form-modal";
import { useCustomerState } from "@/lib/state/customer-state";
import type { PosProduct } from "@/types/domain";

export function CreateProductModal({
  open,
  onClose,
  onCreated
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (message: string, productId?: string) => void;
}) {
  const { createProduct } = useCustomerState();

  return (
    <ProductFormModal
      open={open}
      title="Create Product"
      onClose={onClose}
      onSubmit={(input) => {
        const result = createProduct(input as Omit<PosProduct, "id" | "organizationId"> & { price: string | number });
        if (result.ok) onCreated?.(result.message, result.productId);
        return result;
      }}
    />
  );
}

