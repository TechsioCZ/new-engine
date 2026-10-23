---
name: status-text-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit StatusText
  for inline validation, success, warning, or default status messages with
  default-on state icons and size/alignment props.
metadata:
  component_version: "1.1.1"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
requires:
  - component-usage-ux
  - app-token-overrides
  - ux-guidelines
sources:
  - "libs/ui/src/atoms/status-text.tsx"
  - "libs/ui/src/tokens/components/atoms/_status-text.css"
  - "libs/ui/stories/atoms/status-text.stories.tsx"
  - "libs/ui/src/atoms/status-text.figma.ts"
---

# @techsio/ui-kit StatusText Usage

Use StatusText for short inline messages that describe a nearby field, section,
or operation result.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `StatusText`.

**Use it when**

- Short inline messages tied to a nearby field, section or operation: validation hints, section-level warnings, `Last saved 2 minutes ago`.

**Use something else when**

| Need | Use instead |
| --- | --- |
| Transient confirmation of an action | Toast |
| List of form errors after submit | FormErrorSummary |
| Short state label | Badge |
| Blocking decision | Dialog |

**Do**

- Place it directly under/next to what it describes.
- Use `status` by meaning: `error` blocks, `warning` informs of a consequence, `success` confirms, `default` neutral.
- Keep the icon — colour must not be the only signal.

**Don't**

- Stack many status texts; summarise.
- Use it for long instructions — use help text or docs.

**Copy and states**

- One sentence: what + how to fix for errors (ux-guidelines/ux-writing#messages).

## Setup

```tsx
import { StatusText } from "@techsio/ui-kit/atoms/status-text"

<StatusText status="error" showIcon>
  Email is required.
</StatusText>
```

Supported props:

```text
status: error | success | warning | default
size: sm | md | lg
align: start | center (default start)
showIcon: boolean (default true; do not disable for field validation)
icon: IconType override
```

## Core Patterns

### Use status for message meaning

```text
error -> validation or failed operation
success -> completed operation or valid state
warning -> risky/incomplete state
default -> neutral help text
```

Do not choose status only from color preference.

### State icons are automatic

```tsx
<StatusText status="warning" showIcon>
  Low stock.
</StatusText>
```

Default icons are mapped from status in `status-text.tsx`. Error, warning and
success show them without a showIcon prop. Neutral/default helper text has no
default icon; pass an explicit icon for informational guidance when needed.
Icons are aria-hidden. Keep the state meaning in the sentence as well.

### Use align start for long text

```tsx
<StatusText status="error" align="start" showIcon>
  Password must include at least 12 characters and one symbol.
</StatusText>
```

This keeps the icon aligned with multi-line text.

## Common Mistakes

### HIGH Native paragraph with color class

Wrong:

```tsx
<p className="text-red-500 text-sm">Email is required.</p>
```

Correct:

```tsx
<StatusText status="error">Email is required.</StatusText>
```

Source: libs/ui/src/atoms/status-text.tsx

### HIGH Wrong status name

Wrong:

```tsx
<StatusText status="danger">Failed</StatusText>
```

Correct:

```tsx
<StatusText status="error">Failed</StatusText>
```

Source: libs/ui/src/atoms/status-text.tsx

### HIGH Inline icon/color duplication

Wrong:

```tsx
<StatusText status="success" className="text-green-600">
  Saved
</StatusText>
```

Correct:

```tsx
<StatusText status="success" showIcon>
  Saved
</StatusText>
```

Source: libs/ui/src/tokens/components/atoms/_status-text.css

### MEDIUM Badge used for message text

Wrong:

```tsx
<Badge variant="danger">Email is required.</Badge>
```

Correct:

```tsx
<StatusText status="error">Email is required.</StatusText>
```

## Validation Commands

```sh
rg -n "<p[^>]*className=.*(text-red|text-green|text-warning|text-success)" apps
rg -n "<StatusText[^>]*status=\"(danger|info|primary)\"" apps
rg -n "<StatusText[^>]*className=.*(text-|gap-|mt-|mb-)" apps
rg -n "<Badge[^>]*>[^<]{30,}</Badge>" apps
```


## Field association and wrapping contract

Follow `libs/ui/docs/component-contracts.md`. Put a unique stable id on each
message and merge it into the focusable field's aria-describedby. For errors
also set aria-invalid and aria-errormessage; remove error references on clear.
Compound controls use useDescribedBy/useRegisterDescription/joinDescribedBy.
StatusText cannot infer an unrelated field's ID.

Default align=start uses a first-line-height frame; the icon inherits the message
font size and all wrapped lines remain in the text column. No manual offsets or
extra icon wrappers are needed. Match sm/md/lg to the associated control.

Errors default to role=alert; warning/success use role=status; neutral help has no
live role. Validate on blur/submit and avoid duplicate enclosing live regions.
Override role/ARIA if a parent already owns announcements.

## Secondary feedback scale

Feedback uses a deliberately quieter 12/14/16px sm/md/lg scale. Match the
field size prop rather than choosing a smaller helper size to compensate
for typography. Icons inherit this message scale and stay on its first line.

## Typography overrides

`--line-height-status-text-sm/md/lg` controls the corresponding message line height through the registered text utility. The default is 1.5; a length override is supported. The decorative icon frame stays aligned to the first line.
