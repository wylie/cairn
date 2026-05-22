import { checkInRecords } from "@/lib/mocks/checkins";
import { customers } from "@/lib/mocks/customers";
import { locations } from "@/lib/mocks/locations";
import { memberships } from "@/lib/mocks/memberships";
import { organizations } from "@/lib/mocks/organizations";
import { punchPasses } from "@/lib/mocks/passes";
import { posProducts } from "@/lib/mocks/products";
import { posTransactions } from "@/lib/mocks/transactions";
import { classCampSessions, programs } from "@/lib/mocks/programs";
import { registrations } from "@/lib/mocks/registrations";
import { staffUsers } from "@/lib/mocks/staff";
import { waivers } from "@/lib/mocks/waivers";

export const data = {
  organizations,
  locations,
  staffUsers,
  customers,
  memberships,
  punchPasses,
  waivers,
  checkInRecords,
  programs,
  classCampSessions,
  registrations,
  posProducts,
  posTransactions
};

export const defaultOrganization = organizations[0];
