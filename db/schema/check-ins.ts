import { relations } from "drizzle-orm";
import { pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { customers } from "./customers";
import { facilities } from "./facilities";
import { memberships } from "./memberships";
import { organizations } from "./organizations";
import { staffUsers } from "./staff";

export const checkInAccessStatus = pgEnum("check_in_access_status", ["approved", "denied", "override"]);
export const checkInStatus = pgEnum("check_in_status", ["checked-in", "checked-out"]);

export const checkIns = pgTable("check_ins", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  facilityId: text("facility_id")
    .notNull()
    .references(() => facilities.id, { onDelete: "restrict" }),
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "restrict" }),
  membershipId: text("membership_id").references(() => memberships.id, { onDelete: "set null" }),
  checkedInAt: timestamp("checked_in_at", { withTimezone: true }).defaultNow().notNull(),
  checkedOutAt: timestamp("checked_out_at", { withTimezone: true }),
  status: checkInStatus("status").default("checked-in").notNull(),
  accessStatus: checkInAccessStatus("access_status").default("approved").notNull(),
  denialReason: text("denial_reason"),
  checkedInByStaffId: text("checked_in_by_staff_id").references(() => staffUsers.id, { onDelete: "set null" }),
  checkedInByStaffName: text("checked_in_by_staff_name"),
  checkedOutByStaffId: text("checked_out_by_staff_id").references(() => staffUsers.id, { onDelete: "set null" }),
  checkedOutByStaffName: text("checked_out_by_staff_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const checkInsRelations = relations(checkIns, ({ one }) => ({
  organization: one(organizations, {
    fields: [checkIns.organizationId],
    references: [organizations.id]
  }),
  facility: one(facilities, {
    fields: [checkIns.facilityId],
    references: [facilities.id]
  }),
  customer: one(customers, {
    fields: [checkIns.customerId],
    references: [customers.id]
  }),
  membership: one(memberships, {
    fields: [checkIns.membershipId],
    references: [memberships.id]
  }),
  checkedInByStaff: one(staffUsers, {
    fields: [checkIns.checkedInByStaffId],
    references: [staffUsers.id]
  }),
  checkedOutByStaff: one(staffUsers, {
    fields: [checkIns.checkedOutByStaffId],
    references: [staffUsers.id]
  })
}));
