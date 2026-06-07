# Routing

## Overview
Cairn routing is organization-aware. Public, customer, and staff experiences are derived from URL structure.

## Route Conventions
- global marketing: `/`
- facility landing: `/f/:orgSlug`
- customer portal and public customer-facing flows: `/p/:orgSlug/*`
- staff portal: `/o/:orgSlug/*`
- platform admin: `/admin/*`

## Shared Navigation Context System
Detail pages can preserve workflow origin through URL-based return context.

The current pattern supports:
- source route
- source label
- query-based return state
- safe fallback destinations

This is used for customer detail pages and is intended to expand to other entity detail pages.

## Safety Rules
- reject external return URLs
- reject malformed destinations
- keep organization context intact when returning to an org-scoped route

## SEO and Indexing
Indexable:
- global marketing pages
- facility landing pages
- public program pages

Noindex:
- protected customer portal pages
- staff portal pages

## Related Documentation
- [Architecture](./architecture.md)
- [Reference: Routes](../reference/routes.md)
