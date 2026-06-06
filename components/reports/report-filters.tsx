"use client";

import { SearchInput } from "@/components/shared/search-input";
import type { ReportFilters, ReportRangeKey } from "@/lib/reports/metrics";
import type { Program, StaffUser } from "@/types/domain";

interface ReportFiltersProps {
  filters: ReportFilters;
  onChange: (next: ReportFilters) => void;
  locations: Array<{ id: string; name: string }>;
  households: Array<{ id: string; name: string }>;
  productCategories: Array<{ key: string; label: string }>;
  instructors: StaffUser[];
  programTypes: Array<Program["programType"]>;
  search: string;
  onSearchChange: (value: string) => void;
}

const QUICK_RANGES: Array<{ key: ReportRangeKey; label: string }> = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "quarter_to_date", label: "QTD" },
  { key: "year_to_date", label: "YTD" }
];

export function ReportFiltersBar({ filters, onChange, locations, households, productCategories, instructors, programTypes, search, onSearchChange }: ReportFiltersProps) {
  return (
    <section className="rounded-xl border bg-card p-3" aria-label="report-filters">
      <div className="flex flex-wrap gap-2">
        {QUICK_RANGES.map((range) => (
          <button
            key={range.key}
            className={`h-9 rounded-md px-3 text-sm ${filters.rangeKey === range.key ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}
            onClick={() => onChange({ ...filters, rangeKey: range.key })}
            type="button"
          >
            {range.label}
          </button>
        ))}
      </div>
      <div className="mt-3 grid gap-3 [grid-template-columns:minmax(220px,2fr)_repeat(auto-fit,minmax(140px,1fr))]">
        <SearchInput
          label="Search reports"
          showLabel
          placeholder="Search program, product, customer"
          value={search}
          onChange={onSearchChange}
        />
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Location</span>
          <select
            className="h-11 w-full rounded-md border bg-white px-3"
            value={filters.locationId ?? ""}
            onChange={(event) => onChange({ ...filters, locationId: event.target.value || undefined })}
          >
            <option value="">All locations</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Program type</span>
          <select
            className="h-11 w-full rounded-md border bg-white px-3"
            value={filters.programType ?? "all"}
            onChange={(event) => onChange({ ...filters, programType: (event.target.value as Program["programType"] | "all") || "all" })}
          >
            <option value="all">All types</option>
            {programTypes.filter((type): type is NonNullable<Program["programType"]> => Boolean(type)).map((type) => (
              <option key={type} value={type}>
                {type.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Instructor</span>
          <select
            className="h-11 w-full rounded-md border bg-white px-3"
            value={filters.instructorId ?? "all"}
            onChange={(event) => onChange({ ...filters, instructorId: event.target.value || "all" })}
          >
            <option value="all">All instructors</option>
            {instructors.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.firstName} {entry.lastName}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Age group</span>
          <select
            className="h-11 w-full rounded-md border bg-white px-3"
            value={filters.ageGroup ?? "all"}
            onChange={(event) => onChange({ ...filters, ageGroup: event.target.value as ReportFilters["ageGroup"] })}
          >
            <option value="all">All</option>
            <option value="adult">Adults</option>
            <option value="youth">Youth</option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Product type</span>
          <select
            className="h-11 w-full rounded-md border bg-white px-3"
            value={filters.productType ?? "all"}
            onChange={(event) => onChange({ ...filters, productType: event.target.value as ReportFilters["productType"] })}
          >
            <option value="all">All</option>
            <option value="membership">Membership</option>
            <option value="punch-pass">Punch pass</option>
            <option value="access">Day pass / access</option>
            <option value="class">Class</option>
            <option value="camp">Camp</option>
            <option value="retail">Retail</option>
            <option value="comp">Comp</option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Product category</span>
          <select
            className="h-11 w-full rounded-md border bg-white px-3"
            value={filters.productCategory ?? "all"}
            onChange={(event) => onChange({ ...filters, productCategory: event.target.value || "all" })}
          >
            <option value="all">All categories</option>
            {productCategories.map((entry) => (
              <option key={entry.key} value={entry.key}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Household</span>
          <select
            className="h-11 w-full rounded-md border bg-white px-3"
            value={filters.householdId ?? "all"}
            onChange={(event) => onChange({ ...filters, householdId: event.target.value || "all" })}
          >
            <option value="all">All households</option>
            {households.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Customer segment</span>
          <select
            className="h-11 w-full rounded-md border bg-white px-3"
            value={filters.customerSegment ?? "all"}
            onChange={(event) => onChange({ ...filters, customerSegment: event.target.value as ReportFilters["customerSegment"] })}
          >
            <option value="all">All segments</option>
            <option value="adult">Adults</option>
            <option value="youth">Youth</option>
            <option value="staff">Staff</option>
            <option value="household">Household-linked</option>
          </select>
        </label>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Custom start</span>
          <input
            type="date"
            className="h-11 w-full rounded-md border bg-white px-3"
            value={filters.customStart ?? ""}
            onChange={(event) => onChange({ ...filters, rangeKey: "custom", customStart: event.target.value || undefined })}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Custom end</span>
          <input
            type="date"
            className="h-11 w-full rounded-md border bg-white px-3"
            value={filters.customEnd ?? ""}
            onChange={(event) => onChange({ ...filters, rangeKey: "custom", customEnd: event.target.value || undefined })}
          />
        </label>
      </div>
    </section>
  );
}
