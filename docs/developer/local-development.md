# Local Development

## Prerequisites
- Node.js compatible with the current `next` and `react` versions in `package.json`
- npm

## Install
```bash
npm install
```

## Run the app
```bash
npm run dev
```

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
