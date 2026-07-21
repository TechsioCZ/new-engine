---
name: component-usage-ux
description: >
  Use as the apps/* UI-kit usage orchestrator. Chooses which @techsio/ui-kit
  component and per-component *-usage skill to load before selecting props,
  variants, themes, sizes, slots, framework adapters, and token overrides.
type: composition
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - app-token-overrides
sources:
  - "libs/ui/skills/_artifacts/consumer_app_usage_rules.md"
  - "libs/ui/src/atoms"
  - "libs/ui/src/molecules"
  - "libs/ui/src/organisms"
  - "libs/ui/package.json"
  - "https://zagjs.com/components/react/combobox"
---

# @techsio/ui-kit Component Usage UX

Use this in apps. It is a router, not a complete component manual.

## Setup

Find the component and load its usage skill:

```sh
rg --files libs/ui/src/atoms libs/ui/src/molecules libs/ui/src/organisms
rg -n "name: .*usage" libs/ui/skills/*/SKILL.md
```

Then choose the exact skill:

```text
Button action -> button-usage
Dialog confirmation -> dialog-usage
Toast feedback -> toast-usage
Tree navigation -> tree-view-usage
Loading placeholder -> skeleton-usage
```

## Core Patterns

### Start from UX intent

```text
Destructive action -> Button danger, maybe Dialog confirmation
CRUD success/error -> Toast or StatusText depending persistence and context
Hierarchical navigation -> TreeView
Page trail -> Breadcrumb with framework link adapter when needed
```

Do not begin by writing native HTML.

### Verify props before use

```sh
rg -n "variant:|theme:|size:|export type .*Props|export interface .*Props" libs/ui/src/atoms/button.tsx
```

Never invent props such as `variant="ghost"` unless the component source
actually supports them.

### Read Zag docs for Zag-backed components

```text
Combobox usage
-> read libs/ui/src/molecules/combobox.tsx
-> read https://zagjs.com/components/react/combobox
-> compare our wrapper props/slots to Zag machine props and anatomy
```

Use Zag docs to understand machine capabilities such as collections,
controlled `value`/`inputValue`, `defaultValue`, `multiple`, disabled items,
`closeOnSelect`, open state, and required part props. Then use only the API
that `@techsio/ui-kit` exposes.

### Let tokens handle appearance

```tsx
<Button variant="danger" theme="solid" size="md">
  Delete
</Button>
```

Do not duplicate the component's background, foreground, padding, radius, or
font className when props and tokens already provide it.

### Avoid wrappers before API review

```text
Need NextLink in Breadcrumb?
-> check Breadcrumb.Link props and Link as prop support
-> use framework-consumer-integration
-> wrapper only after proving the component cannot support it
```

Local wrappers are a last resort.

## Common Mistakes

### HIGH Generic usage without component skill

Wrong:

```text
Choose Button props from memory and skip button-usage.
```

Correct:

```text
Load button-usage, inspect Button props, then choose variant/theme/size.
```

Usage rules are intentionally per-component because props differ.

Source: libs/ui/skills/_artifacts/skill_spec.md

### HIGH Native or custom primitive

Wrong:

```tsx
<button className="bg-danger text-white">Delete</button>
```

Correct:

```tsx
<Button variant="danger" theme="solid">Delete</Button>
```

Apps should use UI-kit components when the library already has the primitive.

Source: libs/ui/skills/_artifacts/consumer_app_usage_rules.md

### HIGH Hallucinated component prop

Wrong:

```tsx
<Button variant="ghost">Cancel</Button>
```

Correct:

```tsx
<Button theme="borderless">Cancel</Button>
```

The Button source defines `theme`, not a `ghost` variant.

Source: libs/ui/src/atoms/button.tsx

### HIGH Duplicate prop styling

Wrong:

```tsx
<Button variant="danger" theme="solid" className="bg-danger text-fg-reverse" />
```

Correct:

```tsx
<Button variant="danger" theme="solid" />
```

Component props already map to token-backed visual classes.

Source: libs/ui/skills/_artifacts/consumer_app_usage_rules.md

### MEDIUM Wrapper before API check

Wrong:

```tsx
function AppBreadcrumbLink(props: Props) {
  return <NextLink className="text-primary underline" {...props} />
}
```

Correct:

```tsx
<Breadcrumb.Link as={NextLink} href="/products">
  Products
</Breadcrumb.Link>
```

Check slots, adapter props, and token overrides before creating wrappers.

Source: libs/ui/src/molecules/breadcrumb.tsx

### MEDIUM Zag docs skipped for interactive usage

Wrong:

```text
Implement a custom searchable dropdown because Combobox source looks complex.
```

Correct:

```text
Read combobox-usage, libs/ui/src/molecules/combobox.tsx, and
https://zagjs.com/components/react/combobox before deciding whether the UI-kit
API is missing anything.
```

Zag docs explain the machine props and anatomy behind our wrapper; skipping
them causes unnecessary custom primitives.

Source: https://zagjs.com/components/react/combobox

## Validation Commands

```sh
rg -n '<button|<input|<select|<textarea|animate-pulse|variant="ghost"' apps/<app>
rg -n 'className=.*(bg-|text-|font-|px-|py-|rounded-)' apps/<app>
```
