# Local Development

## Prerequisites
- Node.js compatible with the current `next` and `react` versions in `package.json`
- npm

## Install
```bash
npm install
```

## Environment
Create a local `.env.local` file when database connectivity is needed:

```bash
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
```

Use `.env.example` as the placeholder template. Do not commit real database credentials. Next.js, Drizzle Kit, and the database seed script load `DATABASE_URL` from `.env.local` during local development.

## Run the app
```bash
npm run dev
```

## Database Foundation
The v0.2.x database foundation uses Drizzle with Neon PostgreSQL.

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:studio
```

Use `db:generate` after schema changes, `db:migrate` to apply pending migrations to the configured Neon database, `db:seed` to upsert the demo organizations and facilities, and `db:studio` for local database inspection.

The internal health route is available at `/api/internal/database-health`. It returns `connected` when `DATABASE_URL` is configured and reachable, otherwise `disconnected`.

## Core local URLs
- Marketing site: `/`
- Facility landing: `/f/summit`
- Staff portal: `/o/summit/dashboard`
- Customer portal: `/p/summit/account/dashboard`
- Platform admin: `/admin`

## Mock Authentication

### Staff login
Use `/login` or `/o/:orgSlug/login`.

### Customer login
Use `/p/:orgSlug/login`.

### Platform admin login
Use `/admin/login`.

Demo credentials are documented in [Demo Accounts](../reference/demo-accounts.md).

## Development Notes
- The app is intentionally demoable without Supabase, Stripe, SendGrid, Twilio, or other live services.
- Many workflows persist through local storage-backed mock state.
- Build and test failures may occasionally come from stale local mocked data assumptions rather than framework configuration issues.

## Code Organization Expectations
- route files live in `app/`
- reusable workflow UI should move into `components/`
- domain logic should move into `lib/`
- test coverage belongs in `tests/`

## Recommended Workflow
1. Identify the route and feature area.
2. Check the matching docs file in `docs/facility` or `docs/reference`.
3. Update implementation.
4. Add or update tests.
5. Run `npm test` and `npm run build`.

## Related Documentation
- [Testing](./testing.md)
- [System Architecture](./system-architecture.md)
- [Demo Accounts](../reference/demo-accounts.md)
