# Deployment

## Overview
Cairn is currently structured as a Next.js application that can run locally and in hosted preview environments.

## Current Assumptions
- the repository is the source of truth for the application
- demo behavior relies on mock data and client-side persisted state
- provider integrations are placeholder abstractions, not live service connections

## Local Run
```bash
npm install
npm run dev
```

## Validation Before Deployment
```bash
npm test
npm run build
```

## Deployment Considerations
- facility, customer, staff, and admin route groups must all resolve correctly
- org-scoped routes depend on consistent slug handling
- noindex rules must remain intact for protected customer and staff routes
- public and platform routes should remain crawl-safe

## Future Deployment Work
- production auth providers
- persistent backend services
- external email/SMS/payment providers
- custom domains and subdomains

## Related Documentation
- [Architecture](./architecture.md)
- [Facility Provisioning](./facility-provisioning.md)
