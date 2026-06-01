"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Program, ClassCampSession } from "@/types/domain";
import { getLocationName, getProgramPricing, getSessionStats } from "@/lib/public-programs";

type ProgramCard = {
  program: Program;
  nextSession?: ClassCampSession;
};

export function ProgramCatalog({
  orgSlug,
  cards
}: {
  orgSlug: string;
  cards: ProgramCard[];
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [instructor, setInstructor] = useState("all");
  const [location, setLocation] = useState("all");
  const [ageGroup, setAgeGroup] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const instructors = useMemo(
    () => Array.from(new Set(cards.map((entry) => entry.nextSession?.instructorName).filter(Boolean))) as string[],
    [cards]
  );
  const locations = useMemo(
    () => Array.from(new Set(cards.map((entry) => getLocationName(entry.nextSession?.locationId)))) as string[],
    [cards]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards.filter(({ program, nextSession }) => {
      if (category !== "all" && program.category !== category) return false;
      if (instructor !== "all" && (nextSession?.instructorName ?? "") !== instructor) return false;
      if (location !== "all" && getLocationName(nextSession?.locationId) !== location) return false;
      if (ageGroup !== "all") {
        const min = program.minimumAge ?? 0;
        if (ageGroup === "youth" && min >= 18) return false;
        if (ageGroup === "adult" && min < 18) return false;
      }
      if (dateFrom && nextSession && nextSession.startsAt.slice(0, 10) < dateFrom) return false;
      if (dateTo && nextSession && nextSession.startsAt.slice(0, 10) > dateTo) return false;
      if (availability !== "all" && nextSession) {
        const stats = getSessionStats(nextSession);
        if (availability === "available" && stats.full) return false;
        if (availability === "waitlist" && !stats.full) return false;
      }
      if (!q) return true;
      const haystack = `${program.title} ${program.description ?? ""} ${(program.tags ?? []).join(" ")}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [cards, category, instructor, location, availability, ageGroup, dateFrom, dateTo, query]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4">
        <h1 className="text-2xl font-semibold">Programs</h1>
        <p className="text-sm text-muted-foreground">Browse classes, camps, clinics, and recurring sessions.</p>
      </div>

      <div className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-3 xl:grid-cols-8">
        <label className="space-y-1 md:col-span-2 xl:col-span-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Search</span>
          <input
            className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title, description, tags"
          />
        </label>
        <Select label="Category" value={category} onChange={setCategory} options={[["all", "All"], ["class", "Classes"], ["camp", "Camps"], ["clinic", "Clinics"], ["course", "Courses"]]} />
        <Select label="Availability" value={availability} onChange={setAvailability} options={[["all", "All"], ["available", "Available"], ["waitlist", "Waitlist only"]]} />
        <Select label="Instructor" value={instructor} onChange={setInstructor} options={[["all", "All"], ...instructors.map((name): [string, string] => [name, name])]} />
        <Select label="Location" value={location} onChange={setLocation} options={[["all", "All"], ...locations.map((loc): [string, string] => [loc, loc])]} />
        <Select label="Age group" value={ageGroup} onChange={setAgeGroup} options={[["all", "All"], ["youth", "Youth"], ["adult", "Adult"]]} />
        <label className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Date from</span>
          <input type="date" className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Date to</span>
          <input type="date" className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map(({ program, nextSession }) => {
          const pricing = getProgramPricing(program);
          const stats = nextSession ? getSessionStats(nextSession) : null;
          return (
            <article key={program.id} className="rounded-xl border bg-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{program.category}</p>
              <h2 className="mt-1 text-lg font-semibold">{program.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{program.description}</p>
              <p className="mt-2 text-sm">Instructor: {nextSession?.instructorName ?? "TBD"}</p>
              <p className="text-sm">Age range: {program.minimumAge ?? "All"}{program.maximumAge ? `-${program.maximumAge}` : "+"}</p>
              <p className="text-sm">Location: {getLocationName(nextSession?.locationId)}</p>
              <p className="text-sm">Availability: {stats ? `${stats.spotsRemaining} spots left` : "Schedule coming soon"}</p>
              <p className="mt-2 text-sm font-medium">
                {pricing.memberCents !== null ? `Member ${formatCents(pricing.memberCents)}` : "Member pricing TBD"}
                {" • "}
                {pricing.nonMemberCents !== null ? `Non-member ${formatCents(pricing.nonMemberCents)}` : "Public pricing TBD"}
              </p>
              <div className="mt-3 flex gap-2">
                <Link href={`/p/${orgSlug}/programs/${program.id}`} className="inline-flex h-10 items-center rounded-md border border-input px-3 text-sm font-medium hover:bg-secondary">View Program</Link>
                {nextSession ? (
                  <Link href={`/p/${orgSlug}/sessions/${nextSession.id}`} className="inline-flex h-10 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">Register</Link>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <select className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}
