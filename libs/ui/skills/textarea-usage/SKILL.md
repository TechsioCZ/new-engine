---
name: textarea-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Textarea for
  multi-line text entry with valid variant, size, resize, readonly styling, and
  token-first validation.
metadata:
  component_version: "1.0.1"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
requires:
  - component-usage-ux
  - app-token-overrides
  - ux-guidelines
sources:
  - "libs/ui/src/atoms/textarea.tsx"
  - "libs/ui/src/tokens/components/atoms/_textarea.css"
  - "libs/ui/stories/atoms/textarea.stories.tsx"
  - "libs/ui/src/atoms/textarea.figma.ts"
---

# @techsio/ui-kit Textarea Usage

Use Textarea for multi-line text entry. Use form molecules when a complete
label/help/error field abstraction exists for the current app context.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `Textarea`.

**Use it when**

- Bare multi-line text controls in compositions that supply their own label (inline comment boxes, table editors).

**Use something else when**

| Need | Use instead |
| --- | --- |
| A labelled field | FormTextarea |
| Single-line text | Input |

**Do**

- Give it an accessible name.
- Auto-grow or size to the expected content; keep a sensible max height.

**Don't**

- Use placeholder as the label.

**Copy and states**

- Placeholder as an example (`Add a note for the courier…`).

## Setup

```tsx
import { Textarea } from "@techsio/ui-kit/atoms/textarea"

<Textarea name="note" variant="default" size="md" resize="y" />
```

Supported component props:

```text
variant: default | error | success | warning | borderless
size: sm | md | lg
resize: none | y | x | both | auto
readonly: boolean
```

Use `readonly` when you need the UI-kit readonly visual variant.

## Core Patterns

### Use variant for validation

```tsx
<Textarea aria-describedby="note-error" variant="error" />
```

Do not style borders or placeholders inline for validation.

### Choose resize from layout

```text
y -> normal notes/comments
none -> fixed layout surfaces
auto -> content-sized field when supported by the target browser matrix
both/x -> rare, only when the product explicitly needs it
```

### Use readonly for read-only styling

```tsx
<Textarea readonly value={note} />
```

The component-specific `readonly` prop drives both the visual variant and the
`readOnly` attribute.

## Common Mistakes

### HIGH Native textarea

Wrong:

```tsx
<textarea className="rounded border p-2" />
```

Correct:

```tsx
<Textarea />
```

Source: libs/ui/src/atoms/textarea.tsx

### HIGH Nonexistent validation variant

Wrong:

```tsx
<Textarea variant="danger" />
```

Correct:

```tsx
<Textarea variant="error" />
```

Source: libs/ui/src/atoms/textarea.tsx

### HIGH Inline validation styling

Wrong:

```tsx
<Textarea className="border-red-500 placeholder:text-red-400" />
```

Correct:

```tsx
<Textarea variant="error" />
```

Source: libs/ui/src/tokens/components/atoms/_textarea.css

### MEDIUM readOnly without readonly styling

Wrong:

```tsx
<Textarea readOnly value={note} />
```

Correct:

```tsx
<Textarea readonly value={note} />
```

Use `readonly` so the token-backed readonly styles apply.

## Validation Commands

```sh
rg -n "<textarea\\b|<Textarea[^>]*variant=\"(danger|invalid|primary)\"" apps
rg -n "<Textarea[^>]*className=.*(border-|bg-|text-|placeholder:|p-|px-|py-)" apps
rg -n "<Textarea[^>]*readOnly" apps
rg -n "resize=\"(none|y|x|both|auto)\"" apps
```

