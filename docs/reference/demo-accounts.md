# Demo Accounts

## Overview
These are the current demo accounts used for platform admin, staff, and customer portal access.

The seeded demo organizations are:
- `summit`
- `riverbend` (Riverstone Nature Center)
- `western-carolina-ymca`

These organizations use living demo data generated relative to the current date. Activity stays current without requiring hardcoded date maintenance.

## Authentication Rules
- staff use email and password for login
- staff PINs are used for workstation switching and protected prompts
- customers use email and password
- platform administrators use email and password

## Platform Admin
| Role | Email | Password |
| --- | --- | --- |
| Platform Administrator | `platform@cairn.app` | `dev1234` |

## Staff Accounts

### Summit Rec Collective
| Role | Email | Password | PIN |
| --- | --- | --- | --- |
| Owner | `taylor@summitrec.co` | `dev1234` | `1111` |
| Manager | `maya@summitrec.co` | `dev1234` | `2222` |
| Front Desk | `sam@summitrec.co` | `dev1234` | `3333` |
| Instructor | `iris@summitrec.co` | `dev1234` | `8888` |

### Riverstone Nature Center
| Role | Email | Password | PIN |
| --- | --- | --- | --- |
| Owner | `owner@riverbend.example` | `dev1234` | `9111` |

### Western Carolina YMCA Association
The Western Carolina YMCA Association is seeded as an enterprise platform-admin demo organization for provisioning, billing, and support visibility. Staff login accounts can be added through organization provisioning workflows.

### Multi-Organization Staff
| Role | Email | Password | PIN |
| --- | --- | --- | --- |
| Manager | `multi@example.com` | `dev1234` | Context dependent |

## Customer Portal Accounts
| Customer | Email | Password | Organization |
| --- | --- | --- | --- |
| Maya Patel | `maya.patel@example.com` | `dev1234` | `summit` |
| Alex Rivera | `alex.rivera@example.com` | `dev1234` | `summit` |
| Oslo Fisher | `oslo.fisher@example.com` | `dev1234` | `summit` |

## Related Documentation
- [Permissions Matrix](./permissions-matrix.md)
- [Environments](./environments.md)
- [Developer: Demo Data](../developer/demo-data.md)
- [Business Model](../business-model.md)
