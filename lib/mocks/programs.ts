import type { ClassCampSession, Program } from "@/types/domain";

export const programs: Program[] = [
  { id: "prog_101", organizationId: "org_summit", title: "Morning Mobility Flow", category: "class" },
  { id: "prog_202", organizationId: "org_summit", title: "Youth Adventure Camp", category: "camp" }
];

export const classCampSessions: ClassCampSession[] = [
  {
    id: "sess_001",
    programId: "prog_101",
    locationId: "loc_001",
    startsAt: "2026-05-21T11:00:00Z",
    endsAt: "2026-05-21T11:50:00Z",
    capacity: 20,
    enrolled: 14
  },
  {
    id: "sess_002",
    programId: "prog_202",
    locationId: "loc_002",
    startsAt: "2026-06-15T13:00:00Z",
    endsAt: "2026-06-15T20:00:00Z",
    capacity: 28,
    enrolled: 25
  }
];
