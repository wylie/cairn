# Demo Credentials

These demo accounts are for local development only.

## Authentication Notes

- Login password: used to sign into Cairn at `/login`.
- Staff PIN: used for quick workstation switching and manager approval prompts inside the app.
- Staff PIN does **not** replace login password authentication.

## Summit Rec Collective (`summit`)

| Role | Login Email | Password | Staff PIN | Permission Summary |
| --- | --- | --- | --- | --- |
| Owner | `taylor@summitrec.co` | `dev1234` | `1111` | Full access: customers, check-in, POS, products, reports, staff, settings |
| Manager | `maya@summitrec.co` | `dev1234` | `2222` | Operations + management: products, programs, reports, staff |
| Front Desk | `sam@summitrec.co` | `dev1234` | `3333` | Daily operations: check-in, customers, POS, roster |
| Instructor | `iris@summitrec.co` | `dev1234` | `8888` | Program operations: roster and attendance-focused access |

## Riverbend Recreation Collective (`riverbend`)

| Role | Login Email | Password | Staff PIN | Permission Summary |
| --- | --- | --- | --- | --- |
| Owner | `owner@riverbend.example` | `dev1234` | `9111` | Full access for Riverbend locations |

## Multi-Organization Demo User

| Role | Login Email | Password | Staff PIN | Permission Summary |
| --- | --- | --- | --- | --- |
| Manager (multi-org) | `multi@example.com` | `dev1234` | Uses active staff PIN after org/location context | Access to both Summit and Riverbend organizations |
