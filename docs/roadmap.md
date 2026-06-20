# Roadmap

Cairn's roadmap is version-based so testers and future customers can understand what has already been released, what is currently in active development, and what is planned next.

Targets are planning targets, not guarantees. Dates may change based on tester feedback and pilot customer needs. The roadmap should be reviewed weekly before the Sunday evening release window.

## v0.2.0 - Real Data Foundation

Target: June 29, 2026

Status: In Progress

v0.2.0 starts Cairn's transition from demo/localStorage persistence toward real server-backed persistence. The release establishes the foundation for future workflow migrations without moving customer, membership, program, registration, notification, or UI workflows yet.

The `june-28-2026` branch identifies itself as `v0.2.0` through the centralized `cairnVersion` metadata in `lib/version.ts`. Release Notes continue to show `v0.1.0` as the latest released version while `v0.2.0` remains active development.

Data-mode visibility is part of this release foundation: demo and sandbox organizations are labeled in normal staff workflows, demo organizations show a subtle demonstration-data banner, and Platform Admin views show Demo, Sandbox, and Production badges.

Focus:

- Real Data Foundation Planning - complete
- Database Foundation - complete
- Organization Persistence - complete
- Facility Persistence - complete
- Data Classification Layer - complete
- Staff Accounts Foundation - in progress
- Customer & Household Foundation - in progress
- Neon PostgreSQL
- Drizzle ORM
- Organization data model
- Facility data model
- Staff data model
- Customer data model
- Household data model
- Tenant boundary rules
- localStorage-to-database migration path

## v0.1.0 - Pilot Readiness Release

Date: June 22, 2026

Status: Released

### Platform Foundation

- Release Notes
- Product Roadmap
- Versioning
- Weekly Release Process
- Update Notifications
- Support Console Foundation

### Branding & Marketing

- Stone Cairn branding
- Logo system
- Favicon support
- OG/social sharing metadata
- Marketing site improvements
- Pricing model
- Support model

### Facility Operations

- Customer management
- Household management
- Membership management
- Check-in workflows
- POS workflows
- Programs
- Registrations
- Rentals
- Reporting dashboards

### Demo & Testing Readiness

- Demo organizations
- Demo staff accounts
- Demo customer accounts
- Documentation improvements
- Tester onboarding materials
- Facility-specific login experience

### UX Improvements

- Navigation organization
- Sidebar scrolling fixes
- Notification improvements
- Read/unread notification states
- Notification ordering
- Active navigation fixes
- Dropdown usability improvements
- Loading-state improvements

### Reliability & Quality

- Hydration fixes
- Route cleanup
- Permission cleanup
- Support access model
- Documentation restructuring

### Pilot Program

- External tester onboarding
- Feedback collection
- In-app support requests
- Bug reporting workflow
- Weekly release cadence

## v0.3.0 - Feedback & Usability

Target: July 6, 2026

Status: Planned

Focus:

- Tester feedback
- Workflow refinements
- UI consistency
- Accessibility improvements
- Demo environment improvements

## v0.4.0 - Customer Migration & Onboarding

Target: July 13, 2026

Status: Planned

Focus:

- Customer imports
- Household imports
- Membership imports
- Validation workflows
- Guided onboarding

## v0.5.0 - Operations & Staff Experience

Target: July 20, 2026

Status: Planned

Focus:

- Staff workflow improvements
- Operational alerts
- Reporting enhancements
- Staff productivity tools

## v0.6.0 - Pilot Customer Release

Target: July 27, 2026

Status: Planned

Focus:

- Real facility onboarding
- Support workflow maturity
- Billing readiness
- Remaining operational gaps

## v0.7.0 - Mobile & Member Experience

Target: TBD

Status: Planned

Focus:

- Digital membership cards
- Apple Wallet research
- Google Wallet research
- Customer portal enhancements
- Mobile experience improvements

## v1.0.0 - Production Ready

Status: Future

Criteria:

- Successful pilot facility
- Stable onboarding
- Stable imports
- Stable billing
- Stable support process
- No critical workflow gaps
