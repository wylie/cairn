# Customer Portal

## Overview

The customer portal is the self-service experience for members and households. It supports memberships, registrations, waivers, purchases, receipts, visits, household visibility, billing, facility information, and digital membership cards.

## Common Workflows
- log in and view memberships
- register for a program
- review or sign waivers
- view household member status
- review receipts and billing history

## Step-by-Step: Help a Customer Use the Portal
1. Direct the customer to `/p/:orgSlug/login`.
2. Have them log in with their mock or real account.
3. From the dashboard they can navigate to memberships, waivers, purchases, registrations, visits, and household views.
4. If they need a waiver, use the portal waiver route or public waiver route.

## Tips
- Customer portal routes are organization-scoped and should never expose unrelated customers.
- Household permissions are a core privacy boundary.
- Customer portal pages should inherit branding from facility settings.

## Related Features
- [Waivers](./waivers.md)
- [Registrations](./registrations.md)
- [Digital Membership Cards](./digital-membership-cards.md)
