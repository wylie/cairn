import type { ClassCampSession, Program } from "@/types/domain";

export const programs: Program[] = [
  {
    id: "prog_101",
    organizationId: "org_summit",
    title: "Morning Mobility Flow",
    description: "Low-impact movement and recovery.",
    category: "class",
    active: true,
    colorToken: "green",
    defaultCapacity: 12,
    requiresWaiver: true
  },
  {
    id: "prog_202",
    organizationId: "org_summit",
    title: "Youth Adventure Camp",
    description: "Camp sessions for youth recreation.",
    category: "camp",
    active: true,
    colorToken: "orange",
    defaultCapacity: 24,
    requiresWaiver: true,
    minimumAge: 8,
    maximumAge: 14
  }
];

export const classCampSessions: ClassCampSession[] = [
  {
    id: "sess_001",
    programId: "prog_101",
    locationId: "loc_001",
    title: "Morning Mobility Flow",
    instructorStaffId: "staff_004",
    instructorName: "Iris Chen",
    waitlistEnabled: true,
    waitlistCount: 0,
    status: "scheduled",
    startsAt: "2026-05-21T11:00:00Z",
    endsAt: "2026-05-21T11:50:00Z",
    capacity: 20,
    enrolled: 14
  },
  {
    id: "sess_002",
    programId: "prog_202",
    locationId: "loc_002",
    title: "Youth Adventure Camp - Day 1",
    instructorStaffId: "staff_004",
    instructorName: "Iris Chen",
    waitlistEnabled: true,
    waitlistCount: 2,
    status: "scheduled",
    startsAt: "2026-06-15T13:00:00Z",
    endsAt: "2026-06-15T20:00:00Z",
    capacity: 28,
    enrolled: 25
  }
];
