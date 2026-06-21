# Agent Instructions

The canonical Cairn agent workflow lives in `docs/agent-instructions.md`.

Before performing work, read:

1. `docs/agent-instructions.md`
2. `docs/ai-context.md`
3. `docs/style-guide.md`

## Versioning Requirement

Cairn uses CI/CD with Semantic Versioning.

Every committed code, UI, docs, data, or configuration change must include a version decision.

Default behavior:

- Patch bump for fixes, docs, visual polish, accessibility improvements, refactors, internal cleanup, and small UI improvements.
- Minor bump for new backwards-compatible product functionality, new workflows, new screens, new persisted data capabilities, or new integrations.
- Major bump for breaking changes.

For every prompt that results in a commit:

1. Update the shared version metadata.
2. Add a Release Notes entry for the new version.
3. Ensure the footer and Release Notes page show the new version through shared metadata.
4. Include the version bump in the implementation summary.

If no version bump is needed, explicitly state why.

Future prompts should include:

Follow the Versioning Requirement in /agent-instructions.md.
