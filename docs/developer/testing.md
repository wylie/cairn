# Testing

## Overview
Cairn uses automated tests to protect cross-workflow behavior in a stateful, multi-tenant UI.

## Core Commands
```bash
npm test
npm run build
```

## What Should Be Covered
- route and permission access
- customer portal privacy boundaries
- check-in, registration, waiver, and receipt workflows
- household relationships and managed-member scope
- context-aware navigation
- formatting, avatars, and shared UI patterns
- reporting and dashboard deep links

## Known Reality
Some repository test suites still lag behind current UI and seeded-state behavior. Contributors should fix expectation drift instead of working around it.

## Testing Priorities
- protect operational workflows first
- protect privacy and authorization rules second
- protect shared UI utilities and formatting standards third

## Related Documentation
- [Demo Data](./demo-data.md)
- [Architecture](./architecture.md)
