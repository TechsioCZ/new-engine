---
name: textarea-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Textarea for
  multi-line text entry with valid variant, size, resize, readonly styling, and
  token-first validation.
metadata:
  component_version: "1.0.3"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-usage-ux app-token-overrides ux-guidelines"
  sources: ""
  contributor_sources: "libs/ui/src/atoms/textarea.tsx libs/ui/src/tokens/components/atoms/_textarea.css libs/ui/stories/atoms/textarea.stories.tsx libs/ui/src/atoms/textarea.figma.ts"
  resources: "../../references/component-contracts.md ../../references/consumer_app_usage_rules.md"
  audience: "consumer"
---

> Portable scope: Use the installed package's exported types and bundled sibling skills. Repository source paths are optional contributor evidence, not consumer prerequisites; use the consuming app's own checks. Resolve ../../references/ paths from this skill's folder, not the app working directory.

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
readOnly: boolean
readonly: boolean (legacy alias; prefer readOnly)
```

Use native `readOnly` for both immutable behavior and the full-contrast read-only surface. The legacy `readonly` alias remains supported; explicit `readOnly` takes precedence.

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

### Use readOnly for read-only styling

```tsx
<Textarea readOnly value={note} />
```

Both spellings drive the native attribute and the same full-contrast visual treatment.

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

### MEDIUM Disabling a value that should remain copyable

Wrong:

```tsx
<Textarea disabled value={note} />
```

Correct:

```tsx
<Textarea readOnly value={note} />
```

Use `readOnly` to preserve focus, selection, submission and normal contrast. Disabled takes precedence if both are set.

## Validation Commands

```sh
rg -n "<textarea\\b|<Textarea[^>]*variant=\"(danger|invalid|primary)\"" apps
rg -n "<Textarea[^>]*className=.*(border-|bg-|text-|placeholder:|p-|px-|py-)" apps
rg -n "<Textarea[^>]*readOnly" apps
rg -n "resize=\"(none|y|x|both|auto)\"" apps
```


## Feedback and sizes

The atom generates a stable ID when no nonempty `id` is supplied. Bare field
compositions must associate StatusText IDs through `aria-describedby` and, for
errors, `aria-errormessage`. Use FormTextarea for automatic wiring. Canonical
sizes are sm/md/lg, default md; multiline height comes from rows/content, not
a forced single-line control height.


### Component-specific read-only colors

Override `--color-textarea-bg-readonly` and `--color-textarea-fg-readonly`
to tune only this field's read-only surface and value. The default reference
aliases follow `--color-form-control-readonly` and `--color-form-control-text`.
These overrides also apply on hover/focus; disabled styling still wins.
