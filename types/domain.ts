export type FacilityType = "climbing" | "yoga" | "fitness" | "camp" | "bike_park" | "hybrid";

export interface Organization {
  id: string;
  name: string;
  facilityType: FacilityType;
  timezone: string;
}

export interface Location {
  id: string;
  organizationId: string;
  name: string;
  city: string;
  state: string;
  capacity?: number;
}

export type StaffRole = "owner" | "manager" | "front_desk" | "instructor";

export interface StaffUser {
  id: string;
  organizationId: string;
  locationIds: string[];
  firstName: string;
  lastName: string;
  email: string;
  role: StaffRole;
}

export type MembershipState = "active" | "expiring" | "inactive" | "trial";

export interface Membership {
  id: string;
  customerId: string;
  planName: string;
  status: MembershipState;
  renewalDate?: string;
}

export interface PunchPass {
  id: string;
  customerId: string;
  title: string;
  originalUses: number;
  remainingUses: number;
  expiresAt?: string;
  type?: "multi_visit" | "day_pass";
}

export interface Waiver {
  id: string;
  customerId: string;
  status: "signed" | "expired" | "missing";
  signedAt?: string;
  expiresAt?: string;
}

export interface Customer {
  id: string;
  memberId: string;
  organizationId: string;
  locationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  tags: string[];
  checkInStatus: "in" | "out";
  membershipId?: string;
  punchPassId?: string;
  waiverId?: string;
  dayPassProductName?: string;
  notes?: string;
}

export type CheckInSource = "manual_search" | "barcode_scan" | "pos_sale" | "registration";
export type EntryMethod = "membership" | "multi_visit_pass" | "day_pass" | "class_registration" | "camp_registration" | "staff_comp";
export type CheckInStatus = "checked-in" | "checked-out";

export interface CheckInLogRecord {
  id: string;
  organizationId: string;
  locationId: string;
  customerId: string;
  customerName: string;
  membershipPassType: string;
  entryMethod: EntryMethod;
  passProductUsed?: string;
  punchesUsed?: number;
  punchesRemaining?: number;
  checkInTime: string;
  checkOutTime: string | null;
  checkInSource: CheckInSource;
  status: CheckInStatus;
  staffUserId: string;
  notes?: string;
}

export interface Program {
  id: string;
  organizationId: string;
  title: string;
  category: "class" | "camp" | "clinic" | "course";
}

export interface ClassCampSession {
  id: string;
  programId: string;
  locationId: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  enrolled: number;
}

export interface Registration {
  id: string;
  customerId: string;
  sessionId: string;
  status: "confirmed" | "waitlisted" | "cancelled";
}

export interface PosProduct {
  id: string;
  organizationId: string;
  name: string;
  category: "membership" | "pass" | "retail" | "fee";
  priceCents: number;
}
