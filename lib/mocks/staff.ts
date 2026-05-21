import type { StaffUser } from "@/types/domain";

export const staffUsers: StaffUser[] = [
  {
    id: "staff_001",
    organizationId: "org_summit",
    locationIds: ["loc_001", "loc_002"],
    firstName: "Taylor",
    lastName: "Nguyen",
    email: "taylor.nguyen@example.com",
    role: "front_desk"
  }
];
