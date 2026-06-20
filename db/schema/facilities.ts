import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const facilities = pgTable(
  "facilities",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    organizationSlugUnique: uniqueIndex("facilities_organization_slug_unique").on(table.organizationId, table.slug)
  })
);

export const facilitiesRelations = relations(facilities, ({ one }) => ({
  organization: one(organizations, {
    fields: [facilities.organizationId],
    references: [organizations.id]
  })
}));
