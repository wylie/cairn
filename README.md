# Cairn

Cairn is a multi-tenant facility operations platform for recreation centers, camps, climbing gyms, outdoor programs, fitness facilities, and other organizations that manage customers, memberships, check-ins, registrations, waivers, staff, and point-of-sale workflows.

This repository README is the front door for the Cairn documentation system. Use it to choose the right documentation path instead of relying on one long catch-all file.

## Core Philosophy
- Organization-scoped operations: every facility runs inside its own public site, customer portal, and staff portal.
- Operational speed matters: front desk, instructor, and manager workflows should stay fast under real daily load.
- Privacy by default: customer-facing experiences are scoped to the authenticated customer and their authorized household.
- Pilot-ready business model: Cairn is built by Stone Cairn and charges by facility and support relationship, not by seats, customers, households, transactions, or feature access.
- Mock-first architecture: the product is fully demoable today while preserving clean seams for future backend and provider integrations.
- Shared systems over one-off screens: navigation, avatars, permissions, formatting, and workflow patterns should stay consistent across Cairn.

## Major Features
- Multi-tenant facility landing pages, customer portals, and staff portals
- Customers, households, relationships, profile photos, and activity timelines
- Memberships, passes, receipts, billing foundation, and digital membership cards
- Check-in, occupancy tracking, waiver enforcement, and customer search
- Programs, sessions, registrations, attendance, and waitlists
- POS checkout, products, discounts, receipts, and purchase history
- Rentals, reservations, maintenance blocks, and utilization reporting
- Communications hub, alerts, tasks, and operational dashboards
- Analytics, reports, organization provisioning, and integrations foundation

## Screenshots
Screenshots and launch review assets belong in [`docs/images/`](./docs/images/). The pilot documentation currently prioritizes route walkthroughs, demo credentials, and readiness notes over static screenshots so testers can evaluate the live product directly.

## Documentation Paths

### I'm a Facility
Start here if you operate a facility in Cairn.

- [Facility Getting Started](./docs/facility/getting-started.md)
- [Customers](./docs/facility/customers.md)
- [Households](./docs/facility/households.md)
- [Memberships](./docs/facility/memberships.md)
- [Check-In](./docs/facility/check-in.md)
- [Registrations](./docs/facility/registrations.md)
- [Waivers](./docs/facility/waivers.md)
- [Communications](./docs/facility/communications.md)
- [Rentals](./docs/facility/rentals.md)
- [Reports](./docs/facility/reports.md)
- [Alerts](./docs/facility/alerts.md)
- [Staff](./docs/facility/staff.md)
- [Settings](./docs/facility/settings.md)
- [Troubleshooting](./docs/facility/troubleshooting.md)

### I'm a Developer
Start here if you are building or maintaining Cairn.

- [Architecture](./docs/developer/architecture.md)
- [Deployment](./docs/developer/deployment.md)
- [Demo Data](./docs/developer/demo-data.md)
- [Permissions](./docs/developer/permissions.md)
- [Facility Provisioning](./docs/developer/facility-provisioning.md)
- [Routing](./docs/developer/routing.md)
- [UI Standards](./docs/developer/ui-standards.md)
- [Contributing](./docs/developer/contributing.md)
- [Testing](./docs/developer/testing.md)

### Reference Documentation
Use these docs when you need a stable reference instead of a workflow guide.

- [Demo Accounts](./docs/reference/demo-accounts.md)
- [Permissions Matrix](./docs/reference/permissions-matrix.md)
- [Terminology](./docs/reference/terminology.md)
- [Environments](./docs/reference/environments.md)
- [Routes](./docs/reference/routes.md)
- [Known Issues](./docs/reference/known-issues.md)
- [Business Model](./docs/business-model.md)
- [Releases](./docs/releases.md)
- [Roadmap](./docs/roadmap.md)
- [Pilot Readiness](./docs/pilot-readiness.md)
- [v0.1.0 Pilot Launch Review](./docs/pilot-launch-review.md)

## Local Development
```bash
npm install
npm run dev
```

## Useful Local Routes

When running Cairn locally (`npm run dev`), these routes can help you quickly access the major experiences within the platform.

| Route | Purpose |
|---------|-----------|
| `/` | Public marketing homepage for Cairn. This is the entry point visitors see before logging in. |
| `/f/summit` | Facility landing page for the Summit Rec Collective demo facility. Displays public-facing facility information, programs, announcements, and login options. |
| `/o/summit/dashboard` | Staff operations portal for Summit Rec Collective. This is where front desk staff, managers, and owners perform daily work such as check-ins, memberships, POS transactions, registrations, reports, and customer management. |
| `/p/summit/account/dashboard` | Customer portal experience. Members can view their memberships, household information, registrations, waivers, digital membership cards, and account details. |
| `/admin` | Platform administration area. Used to manage organizations, facilities, feature flags, demo data, permissions, and other Cairn-wide settings. Intended for Cairn administrators only. |

### Route Naming Conventions

Cairn separates experiences into distinct areas of the application:

- `/` → Public website
- `/f/...` → Facility-facing public pages
- `/o/...` → Operational staff portal
- `/p/...` → Customer portal
- `/admin` → Platform administration

Example:

```
/o/summit/customers
```

can be interpreted as:

- `o` = Operations portal
- `summit` = Facility slug
- `customers` = Customer management workspace

### Demo Facility

Most local development examples use the demo organization:

Organization: Summit Rec Collective

Facilities:
- Summit Downtown
- Summit Uptown

All screenshots and walkthroughs throughout the documentation reference this demo environment unless otherwise noted.

## Pricing and Support
Cairn is the facility operations product built by Stone Cairn. Stone Cairn is an Argon Collective LLC company.

Pilot pricing is informational inside the application. Cairn does not enforce feature gates, staff seat limits, customer limits, household limits, or transaction fees. Organizations scale by facilities operated and by the support relationship they choose.

See [Business Model](./docs/business-model.md) for plans, support tiers, trial expectations, and pilot feedback workflows.

## Demo Environment
The current hosted demo is documented in [Reference: Environments](./docs/reference/environments.md).

Use that page for demo access notes. The seeded demo organizations now use living date-relative data so dashboards, check-ins, sessions, receipts, alerts, and reports stay current as the calendar moves forward.

All other documentation assumes you are working in your Cairn instance.

## Contributing
1. Read the relevant facility or developer guide before changing behavior.
2. Follow the shared UI, routing, permission, and formatting patterns already documented in `docs/`.
3. Update tests when behavior changes.
4. Update documentation in the same change when workflows, routes, permissions, or setup expectations change.

See [Contributing](./docs/developer/contributing.md) for the expected workflow.

## Current Product Status
Cairn is in an actively evolving product-build stage.

Current implementation status:
- major staff, customer, public, and platform-admin experiences are present
- most workflows are mock-data and local-state driven
- provider integrations, payments, and external services use pilot adapter boundaries until production providers are connected
- some repository test suites still reflect older UI assumptions and require ongoing cleanup

## Versioning & Releases
Cairn uses CI/CD release discipline with Semantic Versioning.

- `main` is expected to stay deployable.
- Version metadata lives in `lib/version.ts`.
- Release Notes document shipped versions.
- The Roadmap documents future milestones.
- PATCH versions cover fixes, polish, documentation, refactors, and internal improvements.
- MINOR versions cover new user-visible capability.
- MAJOR versions cover breaking schema, API, or architectural changes.

## Existing Notes
The earlier planning and engineering notes remain available and are not removed:
- [Documentation Hub](./docs/README.md)
- [Architecture Notes](./docs/architecture.md)
- [Database Schema Notes](./docs/database-schema.md)
- [Product Vision](./docs/product-vision.md)
- [Roadmap](./docs/roadmap.md)
- [Style Guide](./docs/style-guide.md)
- [Testing Strategy](./docs/testing-strategy.md)
