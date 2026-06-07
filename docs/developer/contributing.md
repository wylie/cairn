# Contributing

## Expectations
- use the style guide as the visual source of truth
- preserve organization scoping and privacy boundaries
- update docs when workflows, routes, or permissions change
- prefer shared components and utilities over screen-specific duplication

## Typical Workflow
1. Identify the route and domain.
2. Read the matching docs file under `docs/facility`, `docs/developer`, or `docs/reference`.
3. Update implementation.
4. Add or update tests.
5. Run `npm test` and `npm run build`.
6. Update documentation in the same change.

## Code Quality Priorities
- shared state should remain canonical
- customer-facing privacy rules are not optional
- avoid hard-coded mock-only hacks in a single workflow
- preserve route and permission consistency across staff, customer, and public experiences

## Documentation Maintenance
When you add or change a major workflow, update:
- the relevant facility guide
- any affected reference docs
- the README hub if the top-level navigation changes

## Related Documentation
- [Testing](./testing.md)
- [UI Standards](./ui-standards.md)
