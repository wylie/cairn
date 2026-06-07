# Page Access Matrix

This matrix documents which audiences can access major Cairn pages today.

## Audience Key
- **Public**: no authenticated user required
- **Customer**: authenticated customer portal user
- **Front Desk**: staff with front desk preset
- **Instructor**: staff with instructor preset
- **Manager**: staff with manager preset
- **Owner**: staff with owner preset
- **Platform Admin**: global admin outside facility scope

## Global + Platform

| Page / Route | Public | Customer | Front Desk | Instructor | Manager | Owner | Platform Admin |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| `/request-demo` | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| `/admin/login` | No | No | No | No | No | No | Yes |
| `/admin/*` | No | No | No | No | No | No | Yes |

## Facility Public + Customer Entry

| Page / Route | Public | Customer | Front Desk | Instructor | Manager | Owner | Platform Admin |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/f/:orgSlug` | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| `/p/:orgSlug/programs` | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| `/p/:orgSlug/programs/:programId` | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| `/p/:orgSlug/sessions/:sessionId` | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| `/p/:orgSlug/waivers/:waiverId` | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| `/p/:orgSlug/kiosk/waivers` | Staff-controlled | No | Yes | No | Yes | Yes | No |
| `/p/:orgSlug/login` | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| `/p/:orgSlug/checkout` | Public flow | Yes | Staff-assisted if opened | Staff-assisted if opened | Staff-assisted if opened | Staff-assisted if opened | No |

## Customer Portal

| Page / Route | Customer | Front Desk | Instructor | Manager | Owner |
| --- | --- | --- | --- | --- | --- |
| `/p/:orgSlug/account/dashboard` | Self + managed household only | Not primary workflow | Not primary workflow | Not primary workflow | Not primary workflow |
| `/p/:orgSlug/account/memberships*` | Self + managed household only | No | No | No | No |
| `/p/:orgSlug/account/registrations*` | Self + managed household only | No | No | No | No |
| `/p/:orgSlug/account/purchases*` | Self + managed household only | No | No | No | No |
| `/p/:orgSlug/account/waivers` | Self + managed household only | No | No | No | No |
| `/p/:orgSlug/account/household` | Managed household only | No | No | No | No |
| `/p/:orgSlug/account/visits` | Self + managed household only | No | No | No | No |
| `/p/:orgSlug/account/billing` | Self + managed household only | No | No | No | No |
| `/p/:orgSlug/account/membership-card` | Self + managed household only | No | No | No | No |

## Staff Portal

| Page / Route | Front Desk | Instructor | Manager | Owner |
| --- | --- | --- | --- | --- |
| `/o/:orgSlug/dashboard` | Yes | Yes | Yes | Yes |
| `/o/:orgSlug/alerts` | Limited operational visibility | Limited operational visibility | Yes | Yes |
| `/o/:orgSlug/customers*` | Yes | No direct management by default | Yes | Yes |
| `/o/:orgSlug/households*` | Yes | No direct management by default | Yes | Yes |
| `/o/:orgSlug/communications` | Transactional only when permitted | Assigned participant messaging only | Yes | Yes |
| `/o/:orgSlug/memberships` | View/support focused | No | Yes | Yes |
| `/o/:orgSlug/billing` | No | No | Yes | Yes |
| `/o/:orgSlug/check-in` | Yes | Limited use | Yes | Yes |
| `/o/:orgSlug/calendar` | Yes | Yes | Yes | Yes |
| `/o/:orgSlug/rentals` | Yes when permitted | No | Yes | Yes |
| `/o/:orgSlug/registrations` | Yes | Yes via roster workflows | Yes | Yes |
| `/o/:orgSlug/pos` | Yes | No | Yes | Yes |
| `/o/:orgSlug/programs` | Usually hidden | Yes | Yes | Yes |
| `/o/:orgSlug/products` | No | No | Yes | Yes |
| `/o/:orgSlug/waivers` | No | No | Yes | Yes |
| `/o/:orgSlug/integrations` | No | No | No | Yes |
| `/o/:orgSlug/reports` | Attendance-oriented subset | Usually no | Yes | Yes |
| `/o/:orgSlug/staff*` | No | No | Yes | Yes |
| `/o/:orgSlug/settings` | No | No | Yes when granted | Yes |

## Notes
- Actual route visibility depends on permission checks, not role name alone.
- Customer portal scope is privacy-limited to self and managed household members.
- Platform admin routes are outside organization scope.

## Related Documentation
- [Permissions Reference](./permissions.md)
- [Routes & Portals](./routes-and-portals.md)
