"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import type { Customer } from "@/types/domain";
import { CustomerAvatar } from "@/components/customers/customer-avatar";
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
  getStatusLines,
  autoFocus,
  emptyMessage = "No customers found.",
  inputRef,
  showLabel = false
}: {
  label: string;
  placeholder: string;
  customers: Customer[];
  query: string;
  onQueryChange: (value: string) => void;
  onSelect: (customerId: string) => void;
  onAddCustomer?: () => void;
  getStatusLines?: (customer: Customer) => string[];
  autoFocus?: boolean;
  emptyMessage?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  showLabel?: boolean;
}) {
  const maxVisibleResults = 50;
  const [highlightIndex, setHighlightIndex] = useState(0);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const open = query.trim().length > 0;

  useEffect(() => {
    setHighlightIndex(0);
  }, [query, customers.length]);

  const sortedCustomers = useMemo(() => {
    return [...customers].sort((a, b) => {
      const aStaff = a.staffProfile?.isStaff ? 1 : 0;
      const bStaff = b.staffProfile?.isStaff ? 1 : 0;
      if (aStaff !== bStaff) return aStaff - bStaff;
      const byLast = a.lastName.localeCompare(b.lastName, "en", { sensitivity: "base" });
      if (byLast !== 0) return byLast;
      return a.firstName.localeCompare(b.firstName, "en", { sensitivity: "base" });
    });
  }, [customers]);
  const displayedCustomers = useMemo(() => sortedCustomers.slice(0, maxVisibleResults), [sortedCustomers]);

  const highlighted = useMemo(() => displayedCustomers[highlightIndex], [displayedCustomers, highlightIndex]);

  useEffect(() => {
    const highlightedOption = optionRefs.current[highlightIndex];
    if (highlightedOption && typeof highlightedOption.scrollIntoView === "function") {
      highlightedOption.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex]);

  return (
    <div className="w-full">
      <SearchInput
        value={query}
        onChange={onQueryChange}
        placeholder={placeholder}
        label={label}
        showLabel={showLabel}
        autoFocus={autoFocus}
        className="h-12 text-base"
        inputRef={inputRef}
        onKeyDown={(event) => {
          if (!open) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setHighlightIndex((prev) => Math.min(prev + 1, Math.max(displayedCustomers.length - 1, 0)));
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
          <p className="text-xs text-muted-foreground" aria-live="polite">
            Showing {displayedCustomers.length} of {sortedCustomers.length} matching customers
            {sortedCustomers.length > maxVisibleResults ? ". Refine your search to narrow results." : "."}
          </p>
          {customers.length > 0 ? (
            <div
              className="max-h-[50vh] space-y-2 overflow-y-auto pr-1 md:max-h-[420px]"
              role="listbox"
              aria-label="Customer search results"
            >
              {displayedCustomers.map((customer, index) => (
                <button
                  key={customer.id}
                  ref={(node) => {
                    optionRefs.current[index] = node;
                  }}
                  role="option"
                  aria-selected={index === highlightIndex}
                  onMouseEnter={() => setHighlightIndex(index)}
                  onClick={() => onSelect(customer.id)}
                  className={`flex min-h-11 w-full items-center justify-between rounded-md border px-3 py-2 text-left ${index === highlightIndex ? "border-primary bg-secondary" : "border-border bg-card hover:bg-secondary"}`}
                >
                  <span className="flex items-center gap-3">
                    <CustomerAvatar customer={customer} size="sm" />
                    <span>
                      <span className="block font-medium">{customer.firstName} {customer.lastName}</span>
                      {customer.preferredName && customer.preferredName.toLowerCase() !== customer.firstName.toLowerCase() ? (
                        <span className="block text-xs text-muted-foreground">Preferred: {customer.preferredName}</span>
                      ) : null}
                      <span className="block text-sm text-muted-foreground">{customer.memberId} • {customer.phone}</span>
                      <span className="mt-1 flex flex-wrap gap-1">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] ${customer.checkInStatus === "in" ? "bg-sky-100 text-sky-900" : "bg-slate-100 text-slate-700"}`}>
                          {customer.checkInStatus === "in" ? "Checked In" : "Checked Out"}
                        </span>
                        {customer.staffProfile?.isStaff ? (
                          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] text-violet-900">
                            Staff
                          </span>
                        ) : null}
                      </span>
                      {getStatusLines ? (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {getStatusLines(customer).join(" • ")}
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">Select</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          )}
          {onAddCustomer ? (
            <div className="border-t pt-2">
              <Button variant="outline" className="min-h-11" onClick={onAddCustomer}>Add Customer</Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
