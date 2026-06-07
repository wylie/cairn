import type { StaffRole } from "@/types/domain";

export interface MockAuthUser {
  id: string;
  staffId?: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: StaffRole;
  organizationSlugs: string[];
  locationIds: string[];
  kind?: "staff" | "platform_admin" | "support_staff";
}

export const mockAuthUsers: MockAuthUser[] = [
  {
    id: "auth_platform_admin",
    email: "platform@cairn.app",
    password: "dev1234",
    firstName: "Cairn",
    lastName: "Platform",
    role: "owner",
    organizationSlugs: [],
    locationIds: [],
    kind: "platform_admin"
  },
  {
    id: "auth_support_staff",
    email: "support@cairn.app",
    password: "dev1234",
    firstName: "Casey",
    lastName: "Support",
    role: "owner",
    organizationSlugs: [],
    locationIds: [],
    kind: "support_staff"
  },
  {
    id: "auth_owner_summit",
    staffId: "staff_001",
    email: "taylor@summitrec.co",
    password: "dev1234",
    firstName: "Taylor",
    lastName: "Nguyen",
    role: "owner",
    organizationSlugs: ["summit"],
    locationIds: ["loc_001", "loc_002"]
  },
  {
    id: "auth_manager_summit",
    staffId: "staff_002",
    email: "maya@summitrec.co",
    password: "dev1234",
    firstName: "Maya",
    lastName: "Lopez",
    role: "manager",
    organizationSlugs: ["summit"],
    locationIds: ["loc_001", "loc_002"]
  },
  {
    id: "auth_frontdesk_summit",
    staffId: "staff_003",
    email: "sam@summitrec.co",
    password: "dev1234",
    firstName: "Sam",
    lastName: "Rivera",
    role: "front_desk",
    organizationSlugs: ["summit"],
    locationIds: ["loc_001"]
  },
  {
    id: "auth_instructor_summit",
    staffId: "staff_008",
    email: "iris@summitrec.co",
    password: "dev1234",
    firstName: "Iris",
    lastName: "Chen",
    role: "instructor",
    organizationSlugs: ["summit"],
    locationIds: ["loc_001"]
  },
  {
    id: "auth_owner_riverbend",
    staffId: "staff_f_001",
    email: "owner@riverbend.example",
    password: "dev1234",
    firstName: "Avery",
    lastName: "Morgan",
    role: "owner",
    organizationSlugs: ["riverbend"],
    locationIds: ["loc_101", "loc_102"]
  },
  {
    id: "auth_multi",
    email: "multi@example.com",
    password: "dev1234",
    firstName: "Morgan",
    lastName: "Lee",
    role: "manager",
    organizationSlugs: ["summit", "riverbend"],
    locationIds: ["loc_001", "loc_002", "loc_101", "loc_102"]
  }
];

export function findMockUser(email: string, password: string) {
  return mockAuthUsers.find((user) => user.email.toLowerCase() === email.toLowerCase().trim() && user.password === password) ?? null;
}

export function getMockUserById(id: string) {
  return mockAuthUsers.find((user) => user.id === id) ?? null;
}
