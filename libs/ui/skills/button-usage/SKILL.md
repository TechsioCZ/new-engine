---
name: button-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Button for
  actions, including correct variant, theme, size, loading state, icon props,
  and token-first styling rules.
metadata:
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  component: "Button"
  component_version: "0.6.0"
requires:
  - component-usage-ux
  - app-token-overrides
  - ux-guidelines
sources:
  - "libs/ui/src/atoms/button.tsx"
  - "libs/ui/src/tokens/components/atoms/_button.css"
  - "libs/ui/stories/atoms/button.stories.tsx"
  - "libs/ui/src/atoms/button.figma.ts"
---

# @techsio/ui-kit Button Usage

Use Button for in-place actions. Use `LinkButton` for navigation that should
look like a button.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `Button`.

**Use it when**

- Any action that changes state on the current page: save, create, delete, open a dialog, apply filters.
- Form submission and dialog/drawer footers.
- Page-level commands in the page header (`New product`).

**Use something else when**

| Need | Use instead |
| --- | --- |
| Navigate to a URL, styled as a button | LinkButton |
| Inline navigation in text | Link |
| Compact repeated icon action | ActionIcon |
| More than three related commands | Menu behind one Button |
| Toggle a setting on/off | Switch |

**Do**

- One `variant="primary"` per surface; secondary actions use `secondary` / `outlined` / `borderless`.
- Order groups `[Cancel] [Primary]` — primary last, at the end of the container (ux-guidelines/feedback-and-actions).
- Use `variant="danger"` only for destructive actions and keep them away from Save.
- Show progress with `isLoading` + `loadingText` (`Saving…`) on the button that started the action.
- Add an `icon` only when it speeds recognition (`+` for New, trash for Delete); keep the text.

**Don't**

- Use `OK`, `Yes`, `Submit`, `Confirm` or `Click here` as labels.
- Put two primary buttons side by side.
- Disable a submit button when the user can't see why (ux-guidelines/states#disabled).
- Fake a link with `onClick={() => router.push()}` — use LinkButton.
- Change the label to a result (`Saved!`); confirm with a Toast instead.

**Copy and states**

- Verb + object in sentence case: `New product`, `Create product`, `Save changes`, `Delete product`, `Discard changes` (full table in ux-guidelines/ux-writing#button-labels).
- `Cancel` leaves a form without saving; `Close` closes something with no pending changes.

## Setup

```tsx
import { Button } from "@techsio/ui-kit/atoms/button"

<Button variant="primary" theme="solid" size="md">
  Save
</Button>
```

Supported visual props from `src/atoms/button.tsx`:

```text
variant: primary | secondary | tertiary | danger | warning
theme: solid | light | borderless | outlined | unstyled
size: sm | md | lg | current
block: boolean
uppercase: boolean
isLoading: boolean
loadingText: string
icon: IconType
iconPosition: left | right
iconSize: xs | sm | md | lg | xl | 2xl | current
```

## Core Patterns

### Component font weight

`--font-weight-button` controls Button and LinkButton, with a default alias to
`--font-weight-medium` (500). Override it in the app's theme or local scope to
change buttons without changing other medium-weight text. No weight prop is
needed. Explicit caller classes such as `font-bold` still override the default.

Migration: an inherited CSS alias resolves where it is declared. A descendant
override of only `--font-weight-medium` no longer changes the default button
weight there. Set `--font-weight-button` in that same scope instead. Global
primitive overrides at the alias declaration scope still apply.

### Choose variant from action semantics

```text
primary -> main positive action in the current scope
secondary -> secondary action with normal emphasis
tertiary -> quiet tertiary action
danger -> destructive action such as delete/remove/cancel order
warning -> risky but not destructive action
```

### Choose theme from emphasis

```text
solid -> strongest emphasis
light -> filled but softer emphasis
outlined -> boundary/emphasis without solid fill
borderless -> quiet action, similar to "ghost"
unstyled -> only when composing inside another component surface
```

There is no `variant="ghost"`. Use `theme="borderless"` for that intent.

### Let Button own its visual styling

```tsx
<Button variant="danger" theme="solid" size="sm">
  Delete
</Button>
```

Do not add background, foreground, padding, border, radius, or font classes
that duplicate Button tokens. If the app needs different colors or sizing,
change app token overrides first.

### Use loading props instead of custom disabling

```tsx
<Button isLoading={isSaving} loadingText="Saving…">
  Save
</Button>
```

Use the component API for loading and disabled state instead of wrapping the
button in a conditional spinner.

## Common Mistakes

### HIGH Native button

Wrong:

```tsx
<button className="bg-primary text-white px-4 py-2">Save</button>
```

Correct:

```tsx
<Button variant="primary" theme="solid">Save</Button>
```

Source: libs/ui/src/atoms/button.tsx

### HIGH Hallucinated ghost variant

Wrong:

```tsx
<Button variant="ghost">Cancel</Button>
```

Correct:

```tsx
<Button variant="secondary" theme="borderless">Cancel</Button>
```

Source: libs/ui/src/atoms/button.tsx

### HIGH Duplicated component tokens in className

Wrong:

```tsx
<Button
  variant="danger"
  theme="solid"
  className="bg-danger text-fg-reverse px-200 py-100"
>
  Delete
</Button>
```

Correct:

```tsx
<Button variant="danger" theme="solid">Delete</Button>
```

If Button danger should look different in the app, override
`--color-button-*` or related semantic tokens in CSS.

Source: libs/ui/src/tokens/components/atoms/_button.css

### MEDIUM Navigation rendered as Button

Wrong:

```tsx
<Button onClick={() => router.push("/products")}>Products</Button>
```

Correct:

```tsx
<LinkButton href="/products">Products</LinkButton>
```

Use Button for actions and LinkButton for navigation.

## Validation Commands

```sh
rg -n "<button|variant=\"ghost\"|variant=\"error\"" apps
rg -n "<Button[^>]*className=.*(bg-|text-|px-|py-|rounded-|border-)" apps
rg -n "<Button[^>]*onClick=.*router\\.push" apps
rg -n "isLoading|loadingText" apps
```

## Shared action contracts

Canonical sizes are `sm`, `md` (default), and `lg`; `current` is only an embedded
composition escape hatch. Icons inherit the button text size unless `iconSize`
is supplied. Buttons default to `type="button"`; use `type="submit"` explicitly
for a form submission. Loading sets `aria-busy` and prevents repeat activation.
Borderless hover/pressed states use readable neutral text on their interaction
surface; warning labels do not depend on colour alone.

## Pending actions and composition

`isLoading` retains keyboard focus and the normal tab stop, exposes `aria-busy`
and `aria-disabled`, and blocks repeat clicks plus native submit/reset defaults.
Reserve `disabled` for genuinely unavailable actions; do not set it just because
an action is pending. On a form, start the pending work in `onSubmit`, prevent
navigation there, and guard the application request too. The pending submitter
also blocks implicit Enter and `requestSubmit()` for that submitter (or without
one), without disabling unrelated submit actions. Focus is never restored over
an intentional move to another control after completion.

Text-bearing buttons use canonical minimum heights and grow when labels wrap.
Keep enough inline space for localized text; icon-only actions use ActionIcon.
Internal kit compositions may set `composition` to omit Button-only font weight
and press scaling, while retaining focus/disabled behavior; the owning component
must then supply its own typography. `theme="unstyled"` alone retains the
existing Button typography/press contract for compatibility.
