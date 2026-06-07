# Known Issues

## Current Known Issues
- Some older automated tests still reflect previous UI labels, seeded-state assumptions, or earlier layout structures.
- Mock-state behavior can expose expectation drift across workflows like check-in, POS, and customer detail tests.
- Provider integrations remain placeholders, so communications, billing, and payment behaviors are not yet backed by live services.
- Some export, download, and email actions are placeholders rather than production-ready implementations.

## Operational Guidance
- Treat the current implementation as an actively evolving product build.
- Validate high-risk workflows manually when changing permissions, privacy rules, receipts, waivers, or check-in logic.

## Future Roadmap Themes
- replace more mock-state behavior with durable backend persistence
- connect real communication, payment, and billing providers
- expand reporting exports and operational audit trails
- support production-ready scanner, wallet, and external integration flows
- continue test-suite stabilization and workflow QA hardening

## Related Documentation
- [Routes](./routes.md)
- [Permissions Matrix](./permissions-matrix.md)
