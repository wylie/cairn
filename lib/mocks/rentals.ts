import type { MaintenanceBlock, RentableResource, ReservationRecord } from "@/types/domain";

export const rentableResources: RentableResource[] = [
  {
    id: "res_room_001",
    organizationId: "org_summit",
    locationId: "loc_001",
    name: "Meeting Room",
    description: "Flexible meeting space for workshops, trainings, and private bookings.",
    type: "space",
    category: "Meeting Space",
    capacity: 16,
    availabilityRules: [
      { id: "avail_room_001_mon", dayOfWeek: 1, opensAt: "08:00", closesAt: "20:00", locationId: "loc_001" },
      { id: "avail_room_001_sat", dayOfWeek: 6, opensAt: "09:00", closesAt: "17:00", locationId: "loc_001" }
    ],
    pricingRules: [
      { id: "price_room_001_flat", type: "flat_rate", label: "Standard booking", priceCents: 7500 },
      { id: "price_room_001_member", type: "member_rate", label: "Member rate", priceCents: 6000, memberPriceCents: 6000 }
    ],
    setupBufferMinutes: 15,
    cleanupBufferMinutes: 15,
    status: "active",
    color: "#0693C2",
    createdAt: "2026-05-01T08:00:00Z"
  },
  {
    id: "res_party_001",
    organizationId: "org_summit",
    locationId: "loc_001",
    name: "Birthday Party Room",
    description: "Private event room with tables, setup access, and party staging area.",
    type: "space",
    category: "Private Event",
    capacity: 24,
    availabilityRules: [{ id: "avail_party_001_sat", dayOfWeek: 6, opensAt: "10:00", closesAt: "18:00", locationId: "loc_001" }],
    pricingRules: [
      { id: "price_party_001_hourly", type: "hourly_rate", label: "Hourly", priceCents: 9500 },
      { id: "price_party_001_household", type: "household_rate", label: "Household package", priceCents: 18000 }
    ],
    waiverTemplateIds: ["wtpl_general"],
    setupBufferMinutes: 30,
    cleanupBufferMinutes: 30,
    status: "active",
    color: "#F59E0B",
    createdAt: "2026-05-01T08:15:00Z"
  },
  {
    id: "res_kayak_001",
    organizationId: "org_summit",
    locationId: "loc_002",
    name: "Touring Kayak",
    description: "Single touring kayak rental for guided and self-guided use.",
    type: "equipment",
    category: "Water Equipment",
    availabilityRules: [{ id: "avail_kayak_001_all", dayOfWeek: 0, opensAt: "07:00", closesAt: "19:00", locationId: "loc_002" }],
    pricingRules: [
      { id: "price_kayak_001_hourly", type: "hourly_rate", label: "Hourly", priceCents: 3200 },
      { id: "price_kayak_001_daily", type: "daily_rate", label: "Daily", priceCents: 11500 }
    ],
    waiverTemplateIds: ["wtpl_general"],
    setupBufferMinutes: 0,
    cleanupBufferMinutes: 15,
    status: "active",
    color: "#10B981",
    createdAt: "2026-05-03T09:00:00Z"
  },
  {
    id: "res_bike_001",
    organizationId: "org_summit",
    locationId: "loc_002",
    name: "Mountain Bike",
    description: "Hardtail mountain bike for trail-center rentals.",
    type: "equipment",
    category: "Trail Equipment",
    availabilityRules: [{ id: "avail_bike_001_all", dayOfWeek: 0, opensAt: "08:00", closesAt: "18:00", locationId: "loc_002" }],
    pricingRules: [
      { id: "price_bike_001_hourly", type: "hourly_rate", label: "Hourly", priceCents: 2800 },
      { id: "price_bike_001_daily", type: "daily_rate", label: "Daily", priceCents: 9900 }
    ],
    waiverTemplateIds: ["wtpl_general"],
    status: "maintenance",
    color: "#EF4444",
    createdAt: "2026-05-04T09:00:00Z"
  },
  {
    id: "res_lesson_001",
    organizationId: "org_summit",
    locationId: "loc_001",
    name: "Private Climbing Lesson",
    description: "One-on-one private instruction experience.",
    type: "experience",
    category: "Instruction",
    capacity: 1,
    availabilityRules: [{ id: "avail_lesson_001_wed", dayOfWeek: 3, opensAt: "12:00", closesAt: "19:00", locationId: "loc_001" }],
    pricingRules: [
      { id: "price_lesson_001_flat", type: "flat_rate", label: "Lesson fee", priceCents: 14500 },
      { id: "price_lesson_001_member", type: "member_rate", label: "Member lesson fee", priceCents: 12500, memberPriceCents: 12500 }
    ],
    waiverTemplateIds: ["wtpl_general"],
    status: "active",
    color: "#8B5CF6",
    createdAt: "2026-05-05T11:00:00Z"
  }
];

export const reservations: ReservationRecord[] = [
  {
    id: "rsv_001",
    organizationId: "org_summit",
    locationId: "loc_001",
    resourceId: "res_room_001",
    reservationType: "single",
    status: "confirmed",
    title: "Community Planning Session",
    customerId: "cust_001",
    participants: [{ customerId: "cust_001", displayName: "Maya Patel" }],
    startsAt: "2026-05-21T15:00:00Z",
    endsAt: "2026-05-21T17:00:00Z",
    setupBufferMinutes: 15,
    cleanupBufferMinutes: 15,
    unavailableStartsAt: "2026-05-21T14:45:00Z",
    unavailableEndsAt: "2026-05-21T17:15:00Z",
    totalPriceCents: 7500,
    createdAt: "2026-05-18T13:00:00Z",
    createdByStaffId: "staff_001",
    createdByStaffName: "Taylor Nguyen"
  },
  {
    id: "rsv_002",
    organizationId: "org_summit",
    locationId: "loc_002",
    resourceId: "res_kayak_001",
    reservationType: "equipment_checkout",
    status: "checked_in",
    title: "Trail Center Kayak Rental",
    customerId: "cust_003",
    householdId: "hh_001",
    participants: [{ customerId: "cust_003", householdId: "hh_001", displayName: "Alex Rivera" }],
    startsAt: "2026-05-21T13:00:00Z",
    endsAt: "2026-05-21T16:00:00Z",
    cleanupBufferMinutes: 15,
    unavailableStartsAt: "2026-05-21T13:00:00Z",
    unavailableEndsAt: "2026-05-21T16:15:00Z",
    waiverTemplateIds: ["wtpl_general"],
    requiresWaiver: true,
    totalPriceCents: 9600,
    checkedInAt: "2026-05-21T12:55:00Z",
    checkedInByStaffId: "staff_002",
    checkedInByStaffName: "Maya Lopez",
    createdAt: "2026-05-20T11:00:00Z",
    createdByStaffId: "staff_002",
    createdByStaffName: "Maya Lopez"
  },
  {
    id: "rsv_003",
    organizationId: "org_summit",
    locationId: "loc_001",
    resourceId: "res_party_001",
    reservationType: "private_event",
    status: "confirmed",
    title: "Rivera Birthday Party",
    customerId: "cust_003",
    householdId: "hh_001",
    participants: [
      { customerId: "cust_003", householdId: "hh_001", displayName: "Alex Rivera" },
      { customerId: "cust_004", householdId: "hh_001", displayName: "Jordan Rivera" }
    ],
    startsAt: "2026-05-24T17:00:00Z",
    endsAt: "2026-05-24T19:00:00Z",
    setupBufferMinutes: 30,
    cleanupBufferMinutes: 30,
    unavailableStartsAt: "2026-05-24T16:30:00Z",
    unavailableEndsAt: "2026-05-24T19:30:00Z",
    waiverTemplateIds: ["wtpl_general"],
    requiresWaiver: true,
    totalPriceCents: 18000,
    createdAt: "2026-05-15T15:00:00Z",
    createdByStaffId: "staff_001",
    createdByStaffName: "Taylor Nguyen"
  }
];

export const maintenanceBlocks: MaintenanceBlock[] = [
  {
    id: "maint_001",
    organizationId: "org_summit",
    locationId: "loc_002",
    resourceId: "res_bike_001",
    title: "Bike under repair",
    description: "Brake bleed and fork service in progress.",
    startsAt: "2026-05-20T08:00:00Z",
    endsAt: "2026-05-27T18:00:00Z",
    createdAt: "2026-05-20T07:30:00Z",
    createdByStaffId: "staff_003",
    createdByStaffName: "Sam Carter"
  }
];
