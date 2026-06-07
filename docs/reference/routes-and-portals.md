# Routes & Portals

## Global
- `/` — Cairn marketing site
- `/login` — staff login helper / org chooser entry
- `/request-demo` — demo request form

## Platform Admin
- `/admin`
- `/admin/organizations`
- `/admin/templates`
- `/admin/demo-facilities`
- `/admin/integrations`
- `/admin/subscriptions`
- `/admin/platform-settings`
- `/admin/login`

## Facility Public
- `/f/:orgSlug`
- `/p/:orgSlug/programs`
- `/p/:orgSlug/programs/:programId`
- `/p/:orgSlug/sessions/:sessionId`
- `/p/:orgSlug/waivers`
- `/p/:orgSlug/waivers/:waiverId`
- `/p/:orgSlug/kiosk/waivers`
- `/p/:orgSlug/store`
- `/p/:orgSlug/checkout`

## Customer Portal
- `/p/:orgSlug/login`
- `/p/:orgSlug/account`
- `/p/:orgSlug/account/dashboard`
- `/p/:orgSlug/account/memberships`
- `/p/:orgSlug/account/memberships/:membershipId`
- `/p/:orgSlug/account/registrations`
- `/p/:orgSlug/account/purchases`
- `/p/:orgSlug/account/waivers`
- `/p/:orgSlug/account/household`
- `/p/:orgSlug/account/visits`
- `/p/:orgSlug/account/billing`
- `/p/:orgSlug/account/facility`
- `/p/:orgSlug/account/membership-card`

## Customer Alias Routes
These mirror key account experiences outside `/account` for cleaner entry paths:
- `/p/:orgSlug/dashboard`
- `/p/:orgSlug/memberships`
- `/p/:orgSlug/memberships/:membershipId`
- `/p/:orgSlug/registrations`
- `/p/:orgSlug/registrations/:registrationId`
- `/p/:orgSlug/purchases`
- `/p/:orgSlug/purchases/:receiptId`
- `/p/:orgSlug/household`
- `/p/:orgSlug/visits`
- `/p/:orgSlug/billing`
- `/p/:orgSlug/facility`
- `/p/:orgSlug/membership-card`

## Staff Portal
- `/o/:orgSlug/login`
- `/o/:orgSlug/dashboard`
- `/o/:orgSlug/alerts`
- `/o/:orgSlug/customers`
- `/o/:orgSlug/customers/:id`
- `/o/:orgSlug/households`
- `/o/:orgSlug/households/:id`
- `/o/:orgSlug/communications`
- `/o/:orgSlug/memberships`
- `/o/:orgSlug/billing`
- `/o/:orgSlug/check-in`
- `/o/:orgSlug/calendar`
- `/o/:orgSlug/rentals`
- `/o/:orgSlug/registrations`
- `/o/:orgSlug/pos`
- `/o/:orgSlug/pos/history`
- `/o/:orgSlug/pos/receipts/:transactionId`
- `/o/:orgSlug/programs`
- `/o/:orgSlug/products`
- `/o/:orgSlug/waivers`
- `/o/:orgSlug/integrations`
- `/o/:orgSlug/reports`
- `/o/:orgSlug/staff`
- `/o/:orgSlug/staff/:id`
- `/o/:orgSlug/settings`
