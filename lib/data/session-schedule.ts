import type { ClassCampSession, Program, Registration } from "@/types/domain";

export type ScheduleView = "day" | "week" | "agenda";

export interface SessionScheduleCardModel {
  session: ClassCampSession;
  program?: Program;
  registrationCount: number;
  waitlistCount: number;
}

export interface SessionFilterValues {
  search: string;
  locationId: string;
  category: "all" | Program["category"];
  instructor: string;
  status: "all" | "scheduled" | "cancelled" | "completed";
  dateKey: string;
}

export function toDateKey(value: string) {
  return value.slice(0, 10);
}

export function buildSessionCards(sessions: ClassCampSession[], programs: Program[], registrations: Registration[]) {
  return sessions.map((session) => ({
    session,
    program: programs.find((entry) => entry.id === session.programId),
    registrationCount: session.enrolled,
    waitlistCount: session.waitlistCount ?? registrations.filter((entry) => entry.sessionId === session.id && entry.status === "waitlisted").length
  }));
}

export function filterScheduleSessions(cards: SessionScheduleCardModel[], filters: SessionFilterValues) {
  const search = filters.search.trim().toLowerCase();

  return cards.filter((entry) => {
    const locationMatch = filters.locationId === "all" || entry.session.locationId === filters.locationId;
    const categoryMatch = filters.category === "all" || entry.program?.category === filters.category;
    const instructorMatch = filters.instructor === "all" || (entry.session.instructorName ?? "unassigned") === filters.instructor;
    const status = entry.session.status ?? "scheduled";
    const statusMatch = filters.status === "all" || status === filters.status;

    const searchHaystack = [
      entry.session.title ?? entry.program?.title ?? "",
      entry.program?.title ?? "",
      entry.session.instructorName ?? "",
      entry.program?.category ?? "",
      entry.session.startsAt
    ]
      .join(" ")
      .toLowerCase();
    const searchMatch = !search || searchHaystack.includes(search);

    return locationMatch && categoryMatch && instructorMatch && statusMatch && searchMatch;
  });
}

export function sortSessionsByStart(cards: SessionScheduleCardModel[]) {
  return [...cards].sort((a, b) => a.session.startsAt.localeCompare(b.session.startsAt));
}

export function sessionsForDay(cards: SessionScheduleCardModel[], dateKey: string) {
  return cards.filter((entry) => toDateKey(entry.session.startsAt) === dateKey);
}

export function sessionsForWeek(cards: SessionScheduleCardModel[], dateKey: string) {
  const selectedDate = new Date(`${dateKey}T00:00:00`);
  const weekStart = new Date(selectedDate);
  const day = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - day);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  return cards.filter((entry) => {
    const startsAtDate = new Date(entry.session.startsAt);
    return startsAtDate >= weekStart && startsAtDate < weekEnd;
  });
}
