import { sql } from "drizzle-orm";
import { facilities, getDatabase, getSqlClient, organizations } from "./index";
import { seedFacilities, seedOrganizations } from "./seed-data";

async function main() {
  const database = getDatabase();
  const sqlClient = getSqlClient();

  if (!database || !sqlClient) {
    throw new Error("DATABASE_URL is required to seed organizations and facilities.");
  }

  await database
    .insert(organizations)
    .values([...seedOrganizations])
    .onConflictDoUpdate({
      target: organizations.id,
      set: {
        name: sql`excluded.name`,
        slug: sql`excluded.slug`,
        updatedAt: sql`now()`
      }
    });

  await database
    .insert(facilities)
    .values([...seedFacilities])
    .onConflictDoUpdate({
      target: facilities.id,
      set: {
        organizationId: sql`excluded.organization_id`,
        name: sql`excluded.name`,
        slug: sql`excluded.slug`,
        updatedAt: sql`now()`
      }
    });

  await sqlClient.end();
  console.log(`Seeded ${seedOrganizations.length} organizations and ${seedFacilities.length} facilities.`);
}

main().catch(async (error: unknown) => {
  const sqlClient = getSqlClient();
  await sqlClient?.end({ timeout: 1 });
  console.error(error);
  process.exit(1);
});
