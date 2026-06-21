# Agent Instructions

## Required Reading

Before performing any work, read:

1. docs/ai-context.md
2. docs/style-guide.md

These documents are the source of truth for product decisions, workflows, design conventions, and development rules.

---

## Working Principles

- Follow all guidance in ai-context.md.
- Follow all UI and UX patterns in style-guide.md.
- Preserve established workflows.
- Avoid introducing unnecessary complexity.
- Prefer consistency over novelty.

---

## Product Priorities

When making decisions, prioritize:

1. Front desk efficiency
2. Operational clarity
3. Data accuracy
4. Staff usability
5. Visual polish

Fast, understandable workflows are more important than adding features.

---

## Development Approach

When implementing changes:

1. Make the smallest effective change.
2. Reuse existing components.
3. Reuse existing patterns.
4. Avoid unrelated refactors.
5. Minimize repository exploration.

Do not redesign working workflows unless explicitly requested.

---

## UI Expectations

Interfaces should be:

- Fast
- Clear
- Accessible
- Consistent

Avoid hiding important operational information behind extra clicks.

Prefer practical workflows over visually impressive solutions.

---

## Bug Fixes

For bug fixes:

- Determine root cause.
- Fix the actual issue.
- Verify related workflows still function.
- Add tests when appropriate.

Do not patch symptoms if a root cause can be addressed.

---

## Testing

Before completing work:

- Run relevant tests.
- Run linting if applicable.
- Verify TypeScript passes if applicable.
- Verify affected workflows manually if necessary.

---

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

---

## Commits

Create logical commits describing completed work.

Do not push.

Leave all commits local for user review.

---

## When Unsure

If requirements are unclear:

- Stop.
- Explain the uncertainty.
- Present options.
- Wait for clarification before proceeding.

## Prompt Shortcuts

"Follow standard workflow"

Means:

- Read ai-context.md
- Read style-guide.md
- Follow all instructions in this file
- Follow the Versioning Requirement in /agent-instructions.md
- Run appropriate tests
- Create logical commits
- Do not push

"Bug batch"

Means:

- Complete all checked work requested from bug-batch.md
- Work through items in order
- Create logical commits
- Do not push

"Investigate only"

Means:

- Determine root cause
- Identify affected files
- Propose fix
- Do not modify code
