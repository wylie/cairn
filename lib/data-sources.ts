export type DataSourceStatus = "Neon-backed" | "Demo-backed" | "Local-only" | "Not Yet Migrated";

export type DataSourceInventoryItem = {
  module: string;
  status: DataSourceStatus;
  currentSource: string;
  repositoryLayer: string;
  scopeAudit: string;
  migrationStatus: string;
  plannedOrder: string;
};

export const dataSourceInventory: DataSourceInventoryItem[] = [
  {
    module: "Organizations",
    status: "Neon-backed",
    currentSource: "Neon via `db/schema/organizations.ts`, `db/repositories/organization-repository.ts`, and seeded fallback in `db/tenant.ts`.",
    repositoryLayer: "Server-only organization repository for slug lookup, platform list reads, and counts.",
    scopeAudit: "Organizations are root tenants. `data_mode` separates demo, sandbox, and production tenants.",
    migrationStatus: "Initial schema, seed data, repository reads, and admin/database visibility are in place.",
    plannedOrder: "Complete foundation; later replace platform-admin browser registry with server-backed provisioning."
  },
  {
    module: "Facilities",
    status: "Neon-backed",
    currentSource: "Neon via `db/schema/facilities.ts`, `db/repositories/facility-repository.ts`, and seeded fallback in `db/tenant.ts`.",
    repositoryLayer: "Facility lookups require organization scope; facility slugs are not globally trusted.",
    scopeAudit: "`facilities.organization_id` is required and the unique slug index is scoped to organization.",
    migrationStatus: "Initial schema, seed data, repository reads, and active facility context are in place.",
    plannedOrder: "Complete foundation; future facility settings writes move after organization provisioning is server-backed."
  },
  {
    module: "Staff",
    status: "Neon-backed",
    currentSource: "Neon via staff users, staff roles, and staff facility access tables; mock authentication remains separate.",
    repositoryLayer: "Server-only reads exist for all staff, one staff user, staff by organization, and staff by facility.",
    scopeAudit: "`staff_users.organization_id`, `staff_roles.organization_id`, and `staff_facility_access.facility_id` provide tenant and facility boundaries.",
    migrationStatus: "Read-only database foundation is in place. Production auth and permission enforcement are future work.",
    plannedOrder: "Next identity phase: production auth, role permissions, and server-side staff session resolution."
  },
  {
    module: "Customers",
    status: "Neon-backed",
    currentSource: "Neon via `customers`, organization-scoped repositories, and server actions for customer profile writes.",
    repositoryLayer: "Server-only customer reads, organization-scoped customer lists, scoped search, counts, create, edit, and delete.",
    scopeAudit: "`customers.organization_id` is required. Customer reads and writes resolve the active organization before repository access.",
    migrationStatus: "Fully persistent for customer profile list/detail/create/edit/delete. Membership, waiver, and check-in behaviors remain separate future migrations.",
    plannedOrder: "Next customer operations phase: imports, merge workflows, audit events, and richer customer profile fields."
  },
  {
    module: "Households",
    status: "Neon-backed",
    currentSource: "Neon via `households` and customer `household_id` links with server actions for household profile writes.",
    repositoryLayer: "Server-only household reads, organization-scoped household lists, counts, create, edit, and delete.",
    scopeAudit: "`households.organization_id` is required. Household reads and writes resolve the active organization before repository access.",
    migrationStatus: "Fully persistent for household list/detail/create/edit/delete and primary-contact assignment. Membership, billing, and relationship detail behavior remain future migrations.",
    plannedOrder: "Next household operations phase: richer household member roles, guardians, emergency contacts, billing contacts, and audit events."
  },
  {
    module: "Memberships",
    status: "Demo-backed",
    currentSource: "`lib/mocks/memberships.ts`, `lib/mocks/access-records.ts`, `lib/mocks/passes.ts`, and `lib/state/customer-state.tsx` local mock persistence.",
    repositoryLayer: "No Neon schema or repository layer yet.",
    scopeAudit: "Mock records carry organization/location fields, but production isolation is not server-enforced.",
    migrationStatus: "Not migrated.",
    plannedOrder: "After customer and household write paths: memberships, access records, renewals, freezes, and card events."
  },
  {
    module: "Check-ins",
    status: "Demo-backed",
    currentSource: "`lib/mocks/checkins.ts` and `lib/state/customer-state.tsx` local mock persistence.",
    repositoryLayer: "No Neon schema or repository layer yet.",
    scopeAudit: "Demo check-ins are scoped in mock state by organization and location keys, but remain browser-local.",
    migrationStatus: "Not migrated.",
    plannedOrder: "After membership access rules: check-in sessions, occupancy, overrides, and audit events."
  },
  {
    module: "Programs",
    status: "Demo-backed",
    currentSource: "`lib/mocks/programs.ts`, `lib/public-programs.ts`, and local mock state.",
    repositoryLayer: "No Neon schema or repository layer yet.",
    scopeAudit: "Mock program records include organization and facility/location assignments, but server isolation is future work.",
    migrationStatus: "Not migrated.",
    plannedOrder: "Program catalog, sessions, instructors, capacity, and public visibility after customer foundations."
  },
  {
    module: "Registrations",
    status: "Demo-backed",
    currentSource: "`lib/mocks/registrations.ts`, program mocks, and local mock state.",
    repositoryLayer: "No Neon schema or repository layer yet.",
    scopeAudit: "Registration demo records reference organization-owned sessions/customers, but writes are not server-authorized.",
    migrationStatus: "Not migrated.",
    plannedOrder: "After programs and customers: registrations, waitlists, participant eligibility, and payment links."
  },
  {
    module: "POS",
    status: "Demo-backed",
    currentSource: "`lib/mocks/products.ts`, `lib/mocks/transactions.ts`, `lib/pos-transactions.ts`, and local mock state.",
    repositoryLayer: "No Neon schema or repository layer yet.",
    scopeAudit: "Transactions/products carry organization or location fields in mock data, but production writes are browser-local.",
    migrationStatus: "Not migrated.",
    plannedOrder: "After check-ins and memberships: products, carts, transactions, receipts, refunds, and inventory."
  },
  {
    module: "Waivers",
    status: "Demo-backed",
    currentSource: "`lib/mocks/waiver-templates.ts`, `lib/mocks/waivers.ts`, signed waiver mocks, public waiver helpers, and local mock state.",
    repositoryLayer: "No Neon schema or repository layer yet.",
    scopeAudit: "Mock waiver templates are organization-owned, but signing and template changes are not durable server records.",
    migrationStatus: "Not migrated.",
    plannedOrder: "After customer/household identity: templates, versions, signed records, guardian signatures, and audit snapshots."
  },
  {
    module: "Reporting",
    status: "Demo-backed",
    currentSource: "`lib/reports/metrics.ts` computes from mock data and local workflow state; saved report UI preferences use localStorage.",
    repositoryLayer: "No Neon reporting repository layer yet.",
    scopeAudit: "Reports derive from selected organization demo state; production aggregation and tenant filtering are future work.",
    migrationStatus: "Not migrated.",
    plannedOrder: "After transactional domains are durable: attendance, revenue, membership, and program reporting."
  },
  {
    module: "Settings",
    status: "Local-only",
    currentSource: "`lib/state/settings-state.tsx` local mock persistence for facility profile, locations, roles, branding, and settings.",
    repositoryLayer: "No Neon settings repository layer yet.",
    scopeAudit: "Settings are scoped by active organization/location mock keys, but are not server-authoritative.",
    migrationStatus: "Not migrated.",
    plannedOrder: "Move durable organization/facility settings after platform provisioning is server-backed."
  },
  {
    module: "Integrations",
    status: "Local-only",
    currentSource: "`lib/integrations/storage.ts` localStorage for connections, webhooks, audit events, and deliveries.",
    repositoryLayer: "No Neon integration repository layer yet.",
    scopeAudit: "Integration keys include organization id, but auditability is local-only.",
    migrationStatus: "Not migrated.",
    plannedOrder: "After identity and permissions: integration connections, webhook logs, and provider audit events."
  },
  {
    module: "Platform Admin Registry",
    status: "Local-only",
    currentSource: "`lib/state/platform-admin-state.tsx` and `lib/platform-admin/registry.ts` use localStorage and cookies.",
    repositoryLayer: "No platform provisioning repository layer yet.",
    scopeAudit: "Seed demo organizations are merged client-side; production provisioning must move server-side before real tenants.",
    migrationStatus: "Not migrated.",
    plannedOrder: "Replace browser registry with server-backed platform organization provisioning."
  }
];

export function getDataSourceStatusTone(status: DataSourceStatus): "default" | "success" | "warning" | "danger" | "muted" {
  if (status === "Neon-backed") return "success";
  if (status === "Demo-backed") return "warning";
  if (status === "Local-only") return "default";
  return "muted";
}
