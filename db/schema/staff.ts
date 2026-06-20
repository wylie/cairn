import { relations } from "drizzle-orm";
import { boolean, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { facilities } from "./facilities";
import { organizations } from "./organizations";

export const staffUsers = pgTable(
  "staff_users",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    organizationEmailUnique: uniqueIndex("staff_users_organization_email_unique").on(table.organizationId, table.email)
  })
);

export const staffRoles = pgTable("staff_roles", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull()
});

export const staffFacilityAccess = pgTable(
  "staff_facility_access",
  {
    staffUserId: text("staff_user_id")
      .notNull()
      .references(() => staffUsers.id, { onDelete: "cascade" }),
    facilityId: text("facility_id")
      .notNull()
      .references(() => facilities.id, { onDelete: "cascade" })
  },
  (table) => ({
    pk: primaryKey({ columns: [table.staffUserId, table.facilityId] })
  })
);

export const staffUsersRelations = relations(staffUsers, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [staffUsers.organizationId],
    references: [organizations.id]
  }),
  facilityAccess: many(staffFacilityAccess)
}));

export const staffRolesRelations = relations(staffRoles, ({ one }) => ({
  organization: one(organizations, {
    fields: [staffRoles.organizationId],
    references: [organizations.id]
  })
}));

export const staffFacilityAccessRelations = relations(staffFacilityAccess, ({ one }) => ({
  staffUser: one(staffUsers, {
    fields: [staffFacilityAccess.staffUserId],
    references: [staffUsers.id]
  }),
  facility: one(facilities, {
    fields: [staffFacilityAccess.facilityId],
    references: [facilities.id]
  })
}));
