---
name: button-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Button for
  actions, including correct variant, theme, size, loading state, icon props,
  and token-first styling rules.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - app-token-overrides
sources:
  - "libs/ui/src/atoms/button.tsx"
  - "libs/ui/src/tokens/components/atoms/_button.css"
  - "libs/ui/stories/atoms/button.stories.tsx"
  - "libs/ui/src/atoms/figma/button.figma.tsx"
---

# @techsio/ui-kit Button Usage

Use Button for in-place actions. Use `LinkButton` for navigation that should
look like a button.

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
<Button isLoading loadingText="Saving" disabled={isSaving}>
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

