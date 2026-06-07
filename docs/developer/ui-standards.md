# UI Standards

This document records the current shared UI rules adopted during the visual consistency pass.

## Spacing Scale
Use a 4px base rhythm.

Preferred scale:
- 4px
- 8px
- 12px
- 16px
- 24px
- 32px

## Cards
- standard card shell: rounded surface with subtle border and low shadow
- standard internal padding: 24px
- first content element should never sit against the top border
- vertical section spacing inside cards: 16px to 24px

## Utility Header Controls
For organization header controls such as occupancy, alerts, sign out, organization switcher, and staff switcher:
- control height: 48px
- rounded corners: large / consistent
- text and icon vertically centered
- icon-only and text controls must share the same visual height

## Chips / Status Badges
- horizontally centered content
- vertically centered content
- minimum height: 28px
- inline padding: 12px
- short, predictable labels preferred

## Avatars
Standard context sizes:
- small: 32px
- medium: 48px
- large: 72px
- extra large: 120px

Rules:
- always true circles
- photo and initials fallback share the same border, shadow, and sizing
- align avatars vertically with their associated text block

## Form Layout
Preferred pattern:
- label above control
- 8px between label and input/select/textarea
- helper/error text below the control

Avoid:
- label jammed directly against a field
- mixed label placement patterns in the same surface

## Page Width Strategy
Cairn is workstation-first.

Current standards:
- staff shell: wider centered workspace for desktop-heavy operations
- customer portal: centered but less constrained than a marketing page
- no page should appear visually shifted left or right
- similar operational pages should not feel like they use different container systems without a good reason

## Grid Usage
Use regular grid layouts for:
- forms
- tables
- scan-heavy operational workspaces
- structured list/detail layouts

Use masonry / flowing column layouts selectively for:
- overview dashboards
- household / alert / insight sections where content height varies significantly

Do not use masonry for:
- forms
- line-item workflows
- tabular operations requiring row scanning

## QR / Scan Visuals
Do not present decorative matrices as if they are production QR codes.

If a code is not actually standards-compliant and scannable:
- label it as a placeholder or token visual
- provide the underlying token clearly
- avoid implying scanner support that does not yet exist

## Related Documentation
- [Style Guide](../style-guide.md)
- [System Architecture](./system-architecture.md)
