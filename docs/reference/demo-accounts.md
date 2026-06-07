# Demo Accounts

This reference combines staff, platform admin, and customer demo access used throughout local Cairn development.

## Authentication Rules
- login password is used for route-level authentication
- staff PIN is used for workstation switching and protected action prompts
- customer accounts use email + password only
- platform admin uses email + password only

## Platform Admin

| Audience | Login Email | Password | Notes |
| --- | --- | --- | --- |
| Platform Administrator | `platform@cairn.app` | `dev1234` | Accesses `/admin/*` |

## Staff Accounts

### Summit Rec Collective (`summit`)

| Role | Login Email | Password | Staff PIN | Notes |
| --- | --- | --- | --- | --- |
| Owner | `taylor@summitrec.co` | `dev1234` | `1111` | Full staff access |
| Manager | `maya@summitrec.co` | `dev1234` | `2222` | Operations + management |
| Front Desk | `sam@summitrec.co` | `dev1234` | `3333` | Front desk operations |
| Instructor | `iris@summitrec.co` | `dev1234` | `8888` | Roster / attendance focus |

### Riverbend Recreation Collective (`riverbend`)

| Role | Login Email | Password | Staff PIN | Notes |
| --- | --- | --- | --- | --- |
| Owner | `owner@riverbend.example` | `dev1234` | `9111` | Riverbend owner |

### Multi-Organization Staff

| Role | Login Email | Password | Staff PIN | Notes |
| --- | --- | --- | --- | --- |
| Manager | `multi@example.com` | `dev1234` | Context-dependent | Can access both Summit and Riverbend |

## Customer Portal Accounts

| Customer | Login Email | Password | Organization |
| --- | --- | --- | --- |
| Maya Patel | `maya.patel@example.com` | `dev1234` | `summit` |
| Alex Rivera | `alex.rivera@example.com` | `dev1234` | `summit` |
| Oslo Fisher | `oslo.fisher@example.com` | `dev1234` | `summit` |

## Useful Login URLs
- platform admin: `/admin/login`
- staff login helper: `/login`
- org staff login: `/o/summit/login`
- org customer login: `/p/summit/login`

## Related Documentation
- [Routes & Portals](./routes-and-portals.md)
- [Page Access Matrix](./page-access-matrix.md)
