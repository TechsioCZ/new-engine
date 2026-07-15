---
name: status-text-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit StatusText
  for inline validation, success, warning, or default status messages with
  optional token icons and size/alignment props.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - app-token-overrides
sources:
  - "libs/ui/src/atoms/status-text.tsx"
  - "libs/ui/src/tokens/components/atoms/_status-text.css"
  - "libs/ui/stories/atoms/status-text.stories.tsx"
  - "libs/ui/src/atoms/figma/status-text.figma.tsx"
---

# @techsio/ui-kit StatusText Usage

Use StatusText for short inline messages that describe a nearby field, section,
or operation result.

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
align: start | center
showIcon: boolean
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

### Use showIcon for scannable state

```tsx
<StatusText status="warning" showIcon>
  Low stock.
</StatusText>
```

Default icons are mapped from status in `status-text.tsx`.

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

