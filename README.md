# Cairn

Cairn is a modern web-based SaaS app for gym and recreation facility operations.

## Stack
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style reusable components
- Supabase-ready architecture with mock data for now
- Stripe-ready placeholders (no billing implementation yet)
- Vitest + React Testing Library

## Core routes
- `/dashboard`
- `/customers`
- `/customers/[id]`
- `/check-in`
- `/calendar`
- `/programs`
- `/pos`
- `/reports`
- `/settings`

## Sample local URLs
- Public marketing: `/`
- Demo facility landing: `/f/summit`
- Customer portal dashboard: `/p/summit/account/dashboard`
- Customer portal memberships: `/p/summit/account/memberships`
- Customer portal registrations: `/p/summit/account/registrations`
- Customer portal purchases: `/p/summit/account/purchases`
- Customer portal household: `/p/summit/account/household`
- Public program catalog: `/p/summit/programs`
- Staff portal dashboard: `/o/summit/dashboard`

## Run locally
```bash
npm install
npm run dev
```

## Run tests
```bash
npm test
npm run test:watch
```

## Build
```bash
npm run build
```

## Docs
See `/docs` for product vision, architecture, schema plan, roadmap, testing strategy, and style guide.
