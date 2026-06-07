# Cairn

Cairn is a multi-tenant facility operations platform for recreation centers, gyms, camps, outdoor programs, and similar membership- and registration-driven organizations.

This README is now a documentation hub. It points you to focused markdown docs instead of acting as a catch-all reference.

## Documentation Paths

### I'm a Facility
- [Documentation Home](./docs/README.md)
- [Facility Guide Index](./docs/facility/README.md)
- [Facility Onboarding](./docs/facility/onboarding.md)
- [Branding](./docs/facility/branding.md)
- [Alerts & Tasks](./docs/facility/alerts.md)
- [Customers](./docs/facility/customers.md)
- [Households](./docs/facility/households.md)
- [Memberships](./docs/facility/memberships.md)
- [Waivers](./docs/facility/waivers.md)
- [Programs](./docs/facility/programs.md)
- [Registrations](./docs/facility/registrations.md)
- [Check-In](./docs/facility/check-in.md)
- [POS](./docs/facility/pos.md)
- [Products](./docs/facility/products.md)
- [Rentals](./docs/facility/rentals.md)
- [Communications](./docs/facility/communications.md)
- [Billing](./docs/facility/billing.md)
- [Analytics](./docs/facility/analytics.md)
- [Customer Portal](./docs/facility/customer-portal.md)
- [Digital Membership Cards](./docs/facility/digital-membership-cards.md)
- [Integrations Foundation](./docs/facility/integrations-foundation.md)

### I'm a Developer
- [Developer Guide Index](./docs/developer/README.md)
- [System Architecture](./docs/developer/system-architecture.md)
- [Local Development](./docs/developer/local-development.md)
- [Testing](./docs/developer/testing.md)
- [Organizations & Provisioning](./docs/developer/organizations.md)
- [Platform Administration](./docs/developer/platform-administration.md)
- [Permissions Reference](./docs/reference/permissions.md)
- [Page Access Matrix](./docs/reference/page-access-matrix.md)
- [Routes & Portals](./docs/reference/routes-and-portals.md)

## Demo / Local URLs
- Public marketing: `/`
- Demo facility landing: `/f/summit`
- Alternate facility landing: `/f/riverbend`
- Staff portal dashboard: `/o/summit/dashboard`
- Customer portal dashboard: `/p/summit/account/dashboard`
- Customer portal alias: `/p/summit/dashboard`
- Public program catalog: `/p/summit/programs`
- Public checkout: `/p/summit/checkout`
- Platform admin: `/admin`

## Local Development
```bash
npm install
npm run dev
```

## Validation
```bash
npm test
npm run build
```

## Existing Documentation
The repo still includes the earlier product and planning docs in `docs/`, including:
- [Architecture Notes](./docs/architecture.md)
- [Database Schema Notes](./docs/database-schema.md)
- [Known Issues](./docs/known-issues.md)
- [Product Vision](./docs/product-vision.md)
- [Roadmap](./docs/roadmap.md)
- [Style Guide](./docs/style-guide.md)
- [Testing Strategy](./docs/testing-strategy.md)
