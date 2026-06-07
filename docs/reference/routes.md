# Routes

## Global Routes
- `/` marketing site
- `/request-demo` live demo request form
- `/login` global staff login helper
- `/admin/*` platform administration

## Public Facility Routes
- `/f/:orgSlug`
- `/p/:orgSlug/programs`
- `/p/:orgSlug/programs/:programId`
- `/p/:orgSlug/sessions/:sessionId`
- `/p/:orgSlug/waivers/:waiverId`
- `/p/:orgSlug/checkout`

## Customer Portal Routes
- `/p/:orgSlug/login`
- `/p/:orgSlug/account/dashboard`
- `/p/:orgSlug/account/memberships*`
- `/p/:orgSlug/account/registrations*`
- `/p/:orgSlug/account/purchases*`
- `/p/:orgSlug/account/waivers`
- `/p/:orgSlug/account/household`
- `/p/:orgSlug/account/visits`
- `/p/:orgSlug/account/billing`
- `/p/:orgSlug/account/membership-card`

## Staff Portal Routes
- `/o/:orgSlug/dashboard`
- `/o/:orgSlug/alerts`
- `/o/:orgSlug/customers*`
- `/o/:orgSlug/households*`
- `/o/:orgSlug/communications`
- `/o/:orgSlug/memberships`
- `/o/:orgSlug/billing`
- `/o/:orgSlug/check-in`
- `/o/:orgSlug/calendar`
- `/o/:orgSlug/rentals`
- `/o/:orgSlug/registrations`
- `/o/:orgSlug/pos`
- `/o/:orgSlug/programs`
- `/o/:orgSlug/products`
- `/o/:orgSlug/waivers`
- `/o/:orgSlug/integrations`
- `/o/:orgSlug/reports`
- `/o/:orgSlug/staff*`
- `/o/:orgSlug/settings`

## Route Rules
- customer-facing and staff-facing protected routes should remain noindexed
- customer portal visibility is limited to self and managed household context
- platform admin is outside organization scope
