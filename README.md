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
