import type { Program, StaffUser } from "@/types/domain";
import { SearchInput } from "@/components/shared/search-input";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-layout";

export function ScheduleFilters({
  search,
  onSearchChange,
  dateKey,
  onDateChange,
  locationId,
  onLocationChange,
  category,
  onCategoryChange,
  instructor,
  onInstructorChange,
  status,
  onStatusChange,
  locations,
  programs,
  instructors
}: {
  search: string;
  onSearchChange: (value: string) => void;
  dateKey: string;
  onDateChange: (value: string) => void;
  locationId: string;
  onLocationChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  instructor: string;
  onInstructorChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  locations: Array<{ id: string; name: string }>;
  programs: Program[];
  instructors: StaffUser[];
}) {
  const categories = Array.from(new Set(programs.map((entry) => entry.category)));

  return (
    <div className="rounded-xl border bg-card p-3" aria-label="schedule-filter-toolbar">
      <div
        className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]"
        data-testid="schedule-filter-grid"
      >
        <FormField label="Search" className="schedule-filter-field min-w-[220px] md:col-span-2">
          <SearchInput
            label="Search"
            value={search}
            onChange={onSearchChange}
            placeholder="Search title, instructor, or program"
            className="h-11"
          />
        </FormField>
        <FormField label="Date" className="schedule-filter-field">
          <Input aria-label="Schedule date" type="date" value={dateKey} onChange={(event) => onDateChange(event.target.value)} className="h-11" />
        </FormField>
        <FormField label="Location" className="schedule-filter-field">
          <select aria-label="Filter location" value={locationId} onChange={(event) => onLocationChange(event.target.value)} className="h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm">
            <option value="all">All locations</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Category" className="schedule-filter-field">
          <select aria-label="Filter category" value={category} onChange={(event) => onCategoryChange(event.target.value)} className="h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm">
            <option value="all">All categories</option>
            {categories.map((entry) => (
              <option key={entry} value={entry}>{entry}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Instructor" className="schedule-filter-field">
          <select aria-label="Filter instructor" value={instructor} onChange={(event) => onInstructorChange(event.target.value)} className="h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm">
            <option value="all">All instructors</option>
            {instructors.map((entry) => (
              <option key={entry.id} value={`${entry.firstName} ${entry.lastName}`}>{entry.firstName} {entry.lastName}</option>
            ))}
            <option value="unassigned">Unassigned</option>
          </select>
        </FormField>
        <FormField label="Status" className="schedule-filter-field">
          <select aria-label="Filter status" value={status} onChange={(event) => onStatusChange(event.target.value)} className="h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm">
            <option value="all">All status</option>
            <option value="scheduled">Scheduled</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
        </FormField>
      </div>
    </div>
  );
}
