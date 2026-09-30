---
name: form-error-summary-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit FormErrorSummary
  for a focusable error summary that links to invalid fields, without depending
  on a specific form library.
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
  - "libs/ui/src/molecules/form-error-summary.tsx"
  - "libs/ui/src/tokens/components/molecules/_form-error-summary.css"
  - "libs/ui/stories/molecules/form-error-summary.stories.tsx"
---

# @techsio/ui-kit FormErrorSummary Usage

Use FormErrorSummary to list validation errors with links that move focus to
the invalid fields. It is presentational and form-library-agnostic.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `FormErrorSummary`.

**Use it when**

- After a failed submit with two or more errors, above the form (or at the top of a long page).
- Server-side validation results that map to several fields.

**Use something else when**

| Need | Use instead |
| --- | --- |
| A single field error | the field's inline error only; focus that field |
| A non-field failure (network, permission) | StatusText above the actions or an error Toast with `Try again` |
| Live validation while typing | inline field errors |

**Do**

- Move focus to the summary after submit; each item links to and focuses its field.
- Word items the same as the inline messages, prefixed by the field label where needed.
- Keep inline errors too — the summary is an index, not a replacement.
- Remove the summary when the errors are fixed or on the next successful submit.

**Don't**

- Show the summary before the user tries to submit.
- Put it in a toast or a dialog.

**Copy and states**

- Title: `There are 3 problems with this form` (pluralised); items: `Enter an SKU with at least 4 characters`.

## Setup

```tsx
import { FormErrorSummary } from "@techsio/ui-kit/molecules/form-error-summary"

<FormErrorSummary
  errors={[
    { id: "name", label: "Enter your name", targetId: "name-field" },
    { id: "email", label: "Enter a valid email", targetId: "email-field" },
  ]}
  onFieldFocus={(targetId) => document.getElementById(targetId)?.focus()}
/>
```

Supported props:

```text
title?: string
errors: { id: string; label: string; targetId: string }[]
onFieldFocus?: (targetId: string) => void
className
```

## Core Patterns

### Link by field id

`targetId` must match the `id` prop of the corresponding `Form*` component. The
summary renders `<a href="#targetId">`, so focus and scroll are native.

### Keep it form-library-agnostic

Do not couple FormErrorSummary to a validation library. Consumers build the
`errors` array and can use `onFieldFocus` for custom scroll/announce behavior.

### Hidden when empty

Pass an empty `errors` array to render nothing.

## Common Mistakes

### HIGH Manual error list

Wrong:

```tsx
<ul>{errors.map((e) => <li>{e.message}</li>)}</ul>
```

Correct:

```tsx
<FormErrorSummary errors={errors} />
```

### HIGH Wrong targetId

Wrong:

```tsx
errors={[{ id: "email", label: "Enter email", targetId: "email" }]}
```

Correct:

```tsx
errors={[{ id: "email", label: "Enter email", targetId: "email-field" }]}
```

Source: libs/ui/src/molecules/form-error-summary.tsx

## Validation Commands

```sh
rg -n "<ul[^>]*>[[:space:]]*\{.*errors|<FormErrorSummary(?![^>]*errors=)" apps
rg -n "targetId=\"" apps
```
