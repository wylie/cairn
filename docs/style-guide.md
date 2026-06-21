# Cairn Style Guide

## Brand feel
Modern, clean, welcoming, and community-first. Operationally fast without feeling corporate.

## Color system

### Core palette
| Token | Hex | Usage |
|---|---|---|
| Primary | `#0693C2` | Primary actions, active nav |
| Primary dark | `#056F92` | Hover/pressed primary |
| Background | `#F8FAFC` | App background |
| Surface | `#FFFFFF` | Cards/panels |
| Text primary | `#1F2A37` | Main text |
| Text muted | `#4B5563` | Secondary labels/help text |
| Border | `#D9E2EC` | Inputs/cards/dividers |
| Accent | `#D1FAE5` | Soft highlights |
| Success | `#10B981` | Positive states |
| Warning | `#F59E0B` | Expiring/attention |
| Danger | `#EF4444` | Blocking/error states |

### Visual swatches
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin:8px 0 16px;">
  <div style="border:1px solid #D9E2EC;border-radius:12px;overflow:hidden;background:#fff"><div style="height:42px;background:#0693C2"></div><div style="padding:8px 10px;font-size:12px">Primary<br><code>#0693C2</code></div></div>
  <div style="border:1px solid #D9E2EC;border-radius:12px;overflow:hidden;background:#fff"><div style="height:42px;background:#056F92"></div><div style="padding:8px 10px;font-size:12px">Primary dark<br><code>#056F92</code></div></div>
  <div style="border:1px solid #D9E2EC;border-radius:12px;overflow:hidden;background:#fff"><div style="height:42px;background:#F8FAFC"></div><div style="padding:8px 10px;font-size:12px">Background<br><code>#F8FAFC</code></div></div>
  <div style="border:1px solid #D9E2EC;border-radius:12px;overflow:hidden;background:#fff"><div style="height:42px;background:#D9E2EC"></div><div style="padding:8px 10px;font-size:12px">Border<br><code>#D9E2EC</code></div></div>
  <div style="border:1px solid #D9E2EC;border-radius:12px;overflow:hidden;background:#fff"><div style="height:42px;background:#10B981"></div><div style="padding:8px 10px;font-size:12px">Success<br><code>#10B981</code></div></div>
  <div style="border:1px solid #D9E2EC;border-radius:12px;overflow:hidden;background:#fff"><div style="height:42px;background:#F59E0B"></div><div style="padding:8px 10px;font-size:12px">Warning<br><code>#F59E0B</code></div></div>
</div>

### Color usage rules (what/when/why)
| Use case | Use | Why |
|---|---|---|
| Main CTA on page | Primary | Signals the single most important next action for speed |
| Secondary actions near CTA | Outline/secondary styles | Prevents visual competition with primary action |
| Success states (checked in, active) | Success tint/badge | Fast positive recognition at front desk |
| Expiring/attention-needed | Warning tint/badge | Communicates urgency without error alarm |
| Hard blockers/errors | Danger tint/text | Reserves red for issues requiring intervention |
| Passive metadata/help text | Text muted | Keeps focus on actionable content |
| Panel backgrounds | Surface on background | Clear hierarchy with low visual noise |

## Typography

### Typeface direction
- Headings/UI emphasis: `Sora` (or `Manrope` fallback)
- Body/UI text: `Inter` (or system sans fallback)
- Monospace: `JetBrains Mono`

### Type scale
| Role | Size / Weight | Example |
|---|---|---|
| Page title | `32px / 700` | Dashboard |
| Section title | `24px / 600` | Customers |
| Card title | `18px / 600` | Daily Operations |
| Body | `14-16px / 400-500` | Labels, metadata |
| Micro label | `12px / 500` | Badge text, helper copy |

### Visual sample
<div style="border:1px solid #D9E2EC;border-radius:12px;padding:14px;background:#fff;">
  <div style="font-family:Sora,Manrope,sans-serif;font-size:32px;font-weight:700;line-height:1.2;">Cairn Front Desk</div>
  <div style="font-family:Sora,Manrope,sans-serif;font-size:24px;font-weight:600;line-height:1.3;margin-top:6px;">Today at a glance</div>
  <div style="font-family:Inter,system-ui,sans-serif;font-size:15px;line-height:1.5;margin-top:8px;color:#4B5563;">Fast customer lookup, clear status, and minimal-click workflows.</div>
  <div style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12px;margin-top:8px;color:#4B5563;">cmd+k • search customers</div>
</div>

### Typography usage rules (what/when/why)
| Use case | Use | Why |
|---|---|---|
| Route-level page heading | Page title style | Gives immediate orientation in one glance |
| Section grouping in page | Section title style | Creates scannable structure without heavy separators |
| Action labels and field labels | Body 14-16px medium | Improves readability and touch confidence |
| Dense helper/meta text | 12px muted | Preserves information without stealing focus |

## Spacing
- Use a `4px` base scale.
- Preferred rhythm: `8, 12, 16, 24, 32`.

### Spacing usage rules
| Use case | Use |
|---|---|
| Within compact controls (badge/input) | `8-12px` |
| Card internal padding | `16px` |
| Section separation on pages | `24px` |
| Major layout rhythm | `32px` |

Why: consistent spacing improves learnability and makes screens feel predictable for new staff.

## Border radius
| Token | Value |
|---|---|
| `radius-sm` | `6px` |
| `radius-md` | `10px` |
| `radius-lg` | `12px` |
| `radius-xl` | `16px` |

### Radius preview
<div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px;">
  <div style="width:90px;height:56px;border:1px solid #D9E2EC;border-radius:6px;background:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;">6px</div>
  <div style="width:90px;height:56px;border:1px solid #D9E2EC;border-radius:10px;background:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;">10px</div>
  <div style="width:90px;height:56px;border:1px solid #D9E2EC;border-radius:12px;background:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;">12px</div>
  <div style="width:90px;height:56px;border:1px solid #D9E2EC;border-radius:16px;background:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;">16px</div>
</div>

### Radius usage rules (what/when/why)
| Use case | Use | Why |
|---|---|---|
| Inputs, chips, compact controls | `radius-sm` or `radius-md` | Crisp and dense for operational speed |
| Cards/panels (default) | `radius-lg` | Friendly but still structured |
| Large callouts/modals | `radius-xl` | Softer grouping for high-level surfaces |

## Borders
| Token | Value | Usage |
|---|---|---|
| `border-subtle` | `1px solid #D9E2EC` | Cards, list items, fields |
| `border-strong` | `1px solid #B8C4D4` | Focused/non-default states |
| Focus ring | `0 0 0 2px #0693C2` | Keyboard focus |

### Border usage rules
| Use case | Use | Why |
|---|---|---|
| Default container/input boundaries | Subtle border | Keeps UI light and modern |
| Selected/active/focused states | Strong border + focus ring | Improves clarity and accessibility |
| Divider between repeated rows | Subtle border only | Maintains scan rhythm without heavy grid look |

## Cards
- Surface: `#FFFFFF`
- Border: `1px solid #D9E2EC`
- Radius: `12px`
- Shadow: very subtle (`0 1px 2px rgba(16,24,40,.06)`)

Why: cards should separate workflow chunks without looking like old desktop window frames.

## Button Standards
- Primary: main action only, filled brand color.
- Secondary: normal actions, white/outline.
- Destructive: final dangerous action, filled red after explicit confirmation.
- Destructive subtle: archive/deactivate/remove, red border/text with light hover.
- Ghost: low-emphasis utility action.
- Keep labels action-first: `Check In`, `Save`, `Add Customer`.

### Button decision rules
| Scenario | Button type |
|---|---|
| Only one obvious next step | Primary |
| Companion action | Secondary |
| Archive/deactivate in dense cards | Destructive subtle |
| Final irreversible action in confirm modal | Destructive |
| Low-emphasis utility action | Ghost |

### Button usage rules
- Archive actions use `destructiveSubtle` by default, not filled red.
- Delete actions use filled destructive in confirmation modals.
- Avoid multiple filled destructive buttons in dense cards.
- Icons are optional and should not create clutter.
- Duplicate actions use `secondary` (outlined), not ghost.

## Badges
- Success: green tint
- Warning: amber tint
- Neutral: slate tint
- Keep wording short and predictable

Why: badges are status beacons, not decorative tags.

### Release badges
Release badges have two separate color systems.

Release type / version chips:
- Major: red / rose
- Minor: blue / teal
- Patch: gray / slate

Current patch example:
- `v0.2.1` Platform Dashboard & Release Notes Polish uses Patch styling.

Release section chips:
- Added: green
- Improved: blue
- Changed: yellow
- Fixed: slate / blue-gray
- Known Issues: amber

Rules:
- Version chips must match the release type.
- Do not use green for version chips.
- Use shared release badge helpers/components instead of repeating class strings.

## Dashboard KPIs
Platform and operations KPI cards should communicate what the number means without relying on surrounding context.

Rules:
- Use specific nouns: `Active Organizations`, `Staff Accounts`, `Database Health`.
- Prefer facility language over location language for platform-level summaries.
- Include a short description under every KPI value.
- Link KPI cards to the most relevant management surface when a clear destination exists.
- Keep cards keyboard-accessible and preserve visible focus styles.
- Avoid non-metric labels such as `Directory` or `Status` as standalone card values.

## Form Standards
All Cairn forms use one consistent pattern across pages and modals.

### Field layout (default)
- Label above control.
- Control directly below label.
- Optional helper/error text below control.

Structure:
- Label
- `[ input / select / textarea ]`
- Helper/error text

Rule:
- Do not place labels inline beside inputs.
- Inline label/control is allowed only for checkbox and radio fields.

### Form components
Use shared components for consistency:
- `FormSection`
- `FormGrid`
- `FormField`
- `TextInput`
- `SelectInput`
- `TextareaInput`
- `CheckboxField`
- `RadioField`
- `FieldGroup`
- `FormActions`

### Input/select/date styling
- Same control height: `44px` (`h-11`).
- Same padding, border, radius, text size.
- Same focus ring.
- Same disabled opacity/state.
- Error/helper text always beneath control.

### Textarea styling
- Matches input/select visual style.
- Default `min-height`: about `96px` (`min-h-24`).
- Same border/radius/focus styling.
- `resize-y` only.

### Checkbox/radio styling
- Default pattern: `[ ] Label`.
- Optional helper text below.
- Do not style default checkbox/radio rows like full text inputs.
- Card-style toggle groups are allowed only when intentionally grouped settings need emphasis.

### Form grid rules
- Desktop: two equal columns by default (`md:grid-cols-2`).
- Mobile: single column (`grid-cols-1`).
- Full-width fields span both columns (`md:col-span-2`).
- Textareas usually span both columns.
- Use consistent `gap` across all rows/columns.

### Form actions
- Actions live in a single `FormActions` row.
- Primary action first in flow.
- Secondary/cancel actions adjacent.
- Keep actions reachable in modal footers (sticky footer in long forms).

Why:
- Fast data entry during front-desk flow.
- Lower cognitive load for staff switching between screens.
- Fewer malformed or misaligned forms.

### Color Inputs
Use a standard color input pattern for true custom brand colors.

Pattern:
- Label
- `[ color swatch ] [ hex input ]`
- Optional helper/error text below

Behavior:
- Use browser-native color picker (`input[type=\"color\"]`) plus a synchronized hex input.
- Swatch and hex value must stay in sync both directions.
- Color preview is always visible through the swatch.
- Validate hex values inline and show clear error text for invalid values.
- Require accessible labels and keyboard support.
- Match Cairn input sizing, borders, spacing, and focus rings.

Usage rules:
- Use `ColorPickerField` for true custom brand colors (for example Branding primary/secondary colors).
- Use dropdowns for controlled palettes (for example role colors, system status colors).
- Do not use free-text hex-only fields.

Examples:
- ✅ Branding colors
- ❌ Staff role system colors (use dropdown)
- ❌ Product/system status colors (use controlled palette)

## Tables/lists
- Prefer responsive list/cards for operations views first.
- Keep columns minimal and scan-friendly.

Why: dense legacy tables slow down new staff and are harder on tablets.

## Empty states
- Explain what is missing.
- Include one clear next action when possible.

Why: empty states are onboarding moments.

## Accessibility expectations
- Keyboard navigable front-desk workflows.
- WCAG-acceptable contrast.
- Semantic landmarks and explicit labels.
- Tablet-friendly touch targets (`>=44px`).

## Voice and tone
- Helpful, direct, calm.
- Avoid enterprise jargon.
- Keep copy short to support staff onboarding.

Why: clear language reduces training time and operational mistakes.
