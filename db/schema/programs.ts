import { relations } from "drizzle-orm";
import { boolean, integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { customers } from "./customers";
import { facilities } from "./facilities";
import { organizations } from "./organizations";
import { staffUsers } from "./staff";

export const programStatus = pgEnum("program_status", ["active", "inactive", "archived"]);
export const programSessionStatus = pgEnum("program_session_status", ["scheduled", "cancelled", "archived"]);
export const programRegistrationStatus = pgEnum("program_registration_status", ["confirmed", "waitlisted", "cancelled", "attended", "absent"]);

export const programs = pgTable("programs", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  facilityId: text("facility_id").references(() => facilities.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").default("class").notNull(),
  capacity: integer("capacity").default(0).notNull(),
  minimumAge: integer("minimum_age"),
  maximumAge: integer("maximum_age"),
  status: programStatus("status").default("active").notNull(),
  waitlistEnabled: boolean("waitlist_enabled").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const programSessions = pgTable("program_sessions", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  facilityId: text("facility_id")
    .notNull()
    .references(() => facilities.id, { onDelete: "restrict" }),
  programId: text("program_id")
    .notNull()
    .references(() => programs.id, { onDelete: "restrict" }),
  title: text("title"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  instructorStaffId: text("instructor_staff_id").references(() => staffUsers.id, { onDelete: "set null" }),
  instructorName: text("instructor_name"),
  capacity: integer("capacity").default(0).notNull(),
  status: programSessionStatus("status").default("scheduled").notNull(),
  waitlistEnabled: boolean("waitlist_enabled").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const programRegistrations = pgTable("program_registrations", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  sessionId: text("session_id")
    .notNull()
    .references(() => programSessions.id, { onDelete: "restrict" }),
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "restrict" }),
  status: programRegistrationStatus("status").default("confirmed").notNull(),
  waitlistPosition: integer("waitlist_position"),
  attendanceStatus: text("attendance_status"),
  registeredAt: timestamp("registered_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const programsRelations = relations(programs, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [programs.organizationId],
    references: [organizations.id]
  }),
  facility: one(facilities, {
    fields: [programs.facilityId],
    references: [facilities.id]
  }),
  sessions: many(programSessions)
}));

export const programSessionsRelations = relations(programSessions, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [programSessions.organizationId],
    references: [organizations.id]
  }),
  facility: one(facilities, {
    fields: [programSessions.facilityId],
    references: [facilities.id]
  }),
  program: one(programs, {
    fields: [programSessions.programId],
    references: [programs.id]
  }),
  instructor: one(staffUsers, {
    fields: [programSessions.instructorStaffId],
    references: [staffUsers.id]
  }),
  registrations: many(programRegistrations)
}));

export const programRegistrationsRelations = relations(programRegistrations, ({ one }) => ({
  organization: one(organizations, {
    fields: [programRegistrations.organizationId],
    references: [organizations.id]
  }),
  session: one(programSessions, {
    fields: [programRegistrations.sessionId],
    references: [programSessions.id]
  }),
  customer: one(customers, {
    fields: [programRegistrations.customerId],
    references: [customers.id]
  })
}));
