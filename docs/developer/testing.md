# Testing

## Tooling
- Vitest
- React Testing Library
- jsdom

## Commands
```bash
npm test
npm run test:watch
npm run build
```

## Coverage Focus
Current tests emphasize user-visible behavior across:
- navigation and portal routing
- customer list and customer detail
- check-in and occupancy
- programs, calendar, and registrations
- POS and receipts
- memberships and billing foundation
- waivers and public signing
- customer portal
- platform administration
- integrations framework

## Test Organization
- `tests/*.test.tsx`: route/component/integration coverage
- `tests/*.test.ts`: utility and provider coverage

## Practical Guidance
- Prefer behavior tests over implementation detail assertions.
- Test permission boundaries explicitly.
- Test route-aware behavior with real-ish params and pathname mocks.
- Preserve mock seed realism; many workflows rely on relationships across customers, households, access, registrations, and transactions.

## Known Reality of the Repo
The suite is extensive and not always fully green. When working in Cairn, separate:
- regressions introduced by your change
- pre-existing failures in older operational suites

If a change is docs-only, a full test run is usually not necessary unless the request explicitly requires it.

## Related Documentation
- [Testing Strategy](../testing-strategy.md)
- [Permissions Reference](../reference/permissions.md)
