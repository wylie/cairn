import { relations } from "drizzle-orm";
import { boolean, date, integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { customers } from "./customers";
import { facilities } from "./facilities";
import { households } from "./households";
import { organizations } from "./organizations";

export const membershipOwnerType = pgEnum("membership_owner_type", ["customer", "household"]);
export const membershipPlanKind = pgEnum("membership_plan_kind", ["individual", "household", "staff"]);
export const membershipStatus = pgEnum("membership_status", ["active", "expired", "cancelled", "suspended"]);

export const membershipPlans = pgTable("membership_plans", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  facilityId: text("facility_id").references(() => facilities.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  kind: membershipPlanKind("kind").default("individual").notNull(),
  durationDays: integer("duration_days").default(30).notNull(),
  priceCents: integer("price_cents").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const memberships = pgTable("memberships", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  facilityId: text("facility_id").references(() => facilities.id, { onDelete: "set null" }),
  planId: text("plan_id")
    .notNull()
    .references(() => membershipPlans.id, { onDelete: "restrict" }),
  ownerType: membershipOwnerType("owner_type").notNull(),
  customerId: text("customer_id").references(() => customers.id, { onDelete: "set null" }),
  householdId: text("household_id").references(() => households.id, { onDelete: "set null" }),
  status: membershipStatus("status").default("active").notNull(),
  startsOn: date("starts_on").notNull(),
  expiresOn: date("expires_on"),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const membershipPlansRelations = relations(membershipPlans, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [membershipPlans.organizationId],
    references: [organizations.id]
  }),
  facility: one(facilities, {
    fields: [membershipPlans.facilityId],
    references: [facilities.id]
  }),
  memberships: many(memberships)
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  organization: one(organizations, {
    fields: [memberships.organizationId],
    references: [organizations.id]
  }),
  facility: one(facilities, {
    fields: [memberships.facilityId],
    references: [facilities.id]
  }),
  plan: one(membershipPlans, {
    fields: [memberships.planId],
    references: [membershipPlans.id]
  }),
  customer: one(customers, {
    fields: [memberships.customerId],
    references: [customers.id]
  }),
  household: one(households, {
    fields: [memberships.householdId],
    references: [households.id]
  })
}));
