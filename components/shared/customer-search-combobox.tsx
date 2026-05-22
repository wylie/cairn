"use client";

import { useEffect, useMemo, useState } from "react";
import type { Customer } from "@/types/domain";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";

export function CustomerSearchCombobox({
  label,
  placeholder,
  customers,
  query,
  onQueryChange,
  onSelect,
  onAddCustomer,
  autoFocus,
  emptyMessage = "No customers found."
}: {
  label: string;
  placeholder: string;
  customers: Customer[];
  query: string;
  onQueryChange: (value: string) => void;
  onSelect: (customerId: string) => void;
  onAddCustomer: () => void;
  autoFocus?: boolean;
  emptyMessage?: string;
}) {
  const [highlightIndex, setHighlightIndex] = useState(0);

  const open = query.trim().length > 0;

  useEffect(() => {
    setHighlightIndex(0);
  }, [query, customers.length]);

  const highlighted = useMemo(() => customers[highlightIndex], [customers, highlightIndex]);

  return (
    <div className="w-full">
      <SearchInput
        value={query}
        onChange={onQueryChange}
        placeholder={placeholder}
        label={label}
        autoFocus={autoFocus}
        className="h-12 text-base"
        onKeyDown={(event) => {
          if (!open) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setHighlightIndex((prev) => Math.min(prev + 1, Math.max(customers.length - 1, 0)));
            return;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlightIndex((prev) => Math.max(prev - 1, 0));
            return;
          }
          if (event.key === "Enter") {
            if (highlighted) {
              event.preventDefault();
              onSelect(highlighted.id);
            }
            return;
          }
          if (event.key === "Escape") {
            event.preventDefault();
            onQueryChange("");
          }
        }}
      />

      {open ? (
        <div className="mt-2 space-y-2 rounded-xl border bg-card p-3">
          {customers.length > 0 ? (
            <div className="space-y-2" role="listbox" aria-label="Customer search results">
              {customers.map((customer, index) => (
                <button
                  key={customer.id}
                  role="option"
                  aria-selected={index === highlightIndex}
                  onMouseEnter={() => setHighlightIndex(index)}
                  onClick={() => onSelect(customer.id)}
                  className={`flex min-h-11 w-full items-center justify-between rounded-md border px-3 py-2 text-left ${index === highlightIndex ? "border-primary bg-secondary" : "border-border bg-card hover:bg-secondary"}`}
                >
                  <span>
                    <span className="block font-medium">{customer.firstName} {customer.lastName}</span>
                    <span className="block text-sm text-muted-foreground">{customer.memberId} • {customer.phone}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">Select</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          )}
          <div className="border-t pt-2">
            <Button variant="outline" className="min-h-11" onClick={onAddCustomer}>Add Customer</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
