# Architecture

## Frontend
- Next.js App Router
- TypeScript
- Tailwind CSS + shadcn/ui-style reusable primitives

## Structure
- `app/` route-based pages
- `components/layout` app shell and navigation
- `components/shared` reusable page-level building blocks
- `components/customers` and `components/checkins` domain UI
- `lib/mocks` static mock data
- `lib/state` client mock workflow state
- `lib/data` selectors and search logic

## Integration readiness
- `TODO(auth)` marks Supabase Auth integration points
- `TODO(supabase)` marks data layer migration points
- `TODO(stripe)` marks billing and subscription integration points
