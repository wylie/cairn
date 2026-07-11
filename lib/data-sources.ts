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
    currentSource: "Neon via `customers`, organization-scoped repositories, server actions, and server-backed customer search.",
    repositoryLayer: "Server-only customer create, read, update, delete, normalized search, count, duplicate-warning, potential duplicate count, and last-created helpers.",
    scopeAudit: "`customers.organization_id` is required. Customer reads, writes, and search resolve the active organization before repository access, and customer records are no longer loaded from or saved to the customer localStorage key.",
    migrationStatus: "Fully persistent for customer profile list/detail/create/edit/delete/search. Search supports partial first name, last name, preferred name, email, and phone matching. Membership and check-in history views now read persisted records. Waiver, merge, import, communications, documents, and audit behaviors remain separate future migrations.",
    plannedOrder: "Next customer operations phase: imports, merge workflows, audit events, communications/documents persistence, and richer relationship behavior."
  },
  {
    module: "Customer Search",
    status: "Neon-backed",
    currentSource: "Neon `customers` through `db/repositories/customer-repository.ts` normalized search helpers.",
    repositoryLayer: "Server-only `searchCustomers(organizationId, query)` requires organization scope and normalizes query text before searching.",
    scopeAudit: "Search resolves the active organization before repository access and cannot return rows from another organization.",
    migrationStatus: "Complete for first name, last name, preferred name, email, phone, and full-name partial matching.",
    plannedOrder: "Future work may add production-scale ranking or dedicated search infrastructure after real customer imports exist."
  },
  {
    module: "Customer Create/Edit/Delete",
    status: "Neon-backed",
    currentSource: "Neon `customers` through server actions in `app/(app)/customers/actions.ts` and customer repository mutations.",
    repositoryLayer: "Server-only create, update, and delete helpers require organization ids; server actions resolve active organization before writes.",
    scopeAudit: "Mutations validate organization ownership, shared customer validation, duplicate warnings, and safe household primary-contact cleanup before deletion.",
    migrationStatus: "Complete for modeled customer profile fields. Imports, merge workflows, audit events, and operational adjunct records remain future work.",
    plannedOrder: "Future customer operations add imports, merge, audit history, and richer communication/document persistence."
  },
  {
    module: "Households",
    status: "Neon-backed",
    currentSource: "Neon via `households`, customer `household_id` links, organization-scoped repositories, and server actions.",
    repositoryLayer: "Server-only household create, read, update, delete, list-by-organization, member reads, member add/remove, primary-contact updates, counts, and duplicate checks.",
    scopeAudit: "`households.organization_id` is required. Household reads and writes resolve the active organization before repository access.",
    migrationStatus: "Fully persistent for household list/detail/create/edit/delete, customer assignment, removal, and primary-contact assignment. Household memberships now persist through membership ownership records; billing and rich relationship-role behavior remain future migrations.",
    plannedOrder: "Next household operations phase: richer household member roles, guardians, emergency contacts, billing contacts, and audit events."
  },
  {
    module: "Household Create/Edit/Delete",
    status: "Neon-backed",
    currentSource: "Neon `households` and customer `household_id` links through server actions in `app/(app)/households/actions.ts`.",
    repositoryLayer: "Server-only household create, update, delete, duplicate-name checks, member reads, primary-contact updates, and customer link clearing.",
    scopeAudit: "Mutations resolve the active organization before writes, validate primary-contact ownership, and clear customer links without deleting customers.",
    migrationStatus: "Complete for household profile records, member assignment, member removal, primary-contact management, and safe household deletion.",
    plannedOrder: "Future household operations add richer relationship roles, guardian permissions, billing roles, imports, and audit events."
  },
  {
    module: "Customer-Household Relationships",
    status: "Neon-backed",
    currentSource: "Neon customer `household_id` links with `customers.household_id` referencing `households.id` using `ON DELETE SET NULL`.",
    repositoryLayer: "Server-only organization-scoped helpers get household members, add a customer, remove a customer, and set the primary contact.",
    scopeAudit: "A customer can belong to zero or one household. Member changes validate customer and household organization ownership before writes.",
    migrationStatus: "Persisted relationship links, safe member removal, safe household deletion, and primary-contact reassignment are in place.",
    plannedOrder: "Future relationship migrations can add explicit roles, guardian permissions, billing roles, and audit events."
  },
  {
    module: "Memberships",
    status: "Neon-backed",
    currentSource: "Neon `membership_plans` and `memberships` through `db/schema/memberships.ts`, `db/repositories/membership-repository.ts`, and membership server actions.",
    repositoryLayer: "Server-only membership plan reads, membership create/read/update/status transitions, customer membership lookups, active-access checks, status counts, plan counts, and data-mode counts.",
    scopeAudit: "`memberships.organization_id` is required and `memberships.facility_id` scopes facility-specific access when present. Membership reads and writes resolve organization and facility context before repository access, and ownership is limited to an organization-owned customer or household.",
    migrationStatus: "Complete for membership plans, individual memberships, household memberships, start and expiration dates, active/expired/cancelled/suspended states, profile visibility, and access-rule lookups. Renewals, payment processing, freezes, card events, and billing remain future work.",
    plannedOrder: "Future membership work: renewals, payment-backed sales, freezes, card events, billing history, and richer reporting."
  },
  {
    module: "Check-ins",
    status: "Neon-backed",
    currentSource: "Neon `check_ins` through `db/schema/check-ins.ts`, `db/repositories/check-in-repository.ts`, and check-in server actions.",
    repositoryLayer: "Server-only check-in, check-out, active roster, today history, customer history, status counts, data-mode counts, duplicate-active prevention, and integrity checks.",
    scopeAudit: "`check_ins.organization_id`, `facility_id`, and `customer_id` are required. Check-ins validate customer and facility organization ownership, enforce active membership access unless staff override is used, and prevent duplicate active check-ins per organization/customer.",
    migrationStatus: "Complete for customer check-in, check-out, currently-in roster, today history, customer profile history, staff override records, and admin diagnostics. Backdated check-in, capacity rules, automatic closeout, and waiver enforcement remain future work.",
    plannedOrder: "Future attendance work: capacity rules, backdated corrections, automatic closeout, waiver-backed blocks, audit events, and reporting."
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
