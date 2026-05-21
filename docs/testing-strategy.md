# Testing Strategy

## Approach
- Use TDD where practical: behavior tests first, then minimal implementation.
- Keep tests readable and focused on user-visible outcomes.

## Test layers
- Unit/component tests: Vitest + React Testing Library
- Optional minimal e2e: Playwright for one critical flow if needed

## Current focus
- App shell rendering
- Navigation links
- Customer list rendering and filtering
- Customer status badges
- Customer detail sections
- Check-in list and action states
- Empty states

## Commands
- `npm test` for CI-style run
- `npm run test:watch` for local iteration
