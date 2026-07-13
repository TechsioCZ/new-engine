---
name: app-ui-kit-audit
description: >
  Use when reviewing an apps/* UI for correct @techsio/ui-kit adoption:
  existing component usage, native HTML replacement, nonexistent props,
  duplicate className styling, token-first violations, framework adapter
  mistakes, unnecessary wrappers, and UI-kit API gaps.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - app-token-overrides
sources:
  - "libs/ui/skills/_artifacts/consumer_app_usage_rules.md"
  - "libs/ui/package.json"
  - "libs/ui/src/atoms"
  - "libs/ui/src/molecules"
  - "libs/ui/src/tokens/components"
---

# @techsio/ui-kit App Adoption Audit

Run this before handing off app UI that consumes `@techsio/ui-kit`.

## Component Checks

### Check: existing component used

Expected:

```tsx
import { TreeView } from "@techsio/ui-kit/molecules/tree-view"
```

Fail condition: custom tree, dialog, toast, button, input, or skeleton exists
while UI-kit has the component.
Fix: replace with UI-kit component or record the missing API gap.

### Check: props exist

Expected:

```tsx
<Button variant="danger" theme="solid" size="md" />
```

Fail condition: `variant="ghost"` or other props not in component source.
Fix: load the per-component usage skill and inspect the source props.

### Check: appearance is token-first

Expected:

```tsx
<Button variant="primary" theme="solid" />
```

Fail condition: `className` duplicates background, text color, padding, radius,
or font weight already provided by props/tokens.
Fix: move visual differences into app token overrides.

## Audit Commands

```sh
rg -n '<button|<input|<select|<textarea|animate-pulse' apps/<app>
rg -n 'variant="ghost"|theme="ghost"|size="xl"' apps/<app>
rg -n 'className=.*(bg-|text-|font-|px-|py-|rounded-|border-)' apps/<app>
rg -n 'function .*Button|function .*Dialog|function .*Breadcrumb|function .*Tree' apps/<app>
rg -n '@techsio/ui-kit/tokens|@techsio/ui-kit/tokens-with-tailwind' apps/<app>
```

## Common Mistakes

### HIGH Missed existing component

Wrong:

```tsx
function CategoryTree() {
  return <div>{items.map((item) => <button>{item.label}</button>)}</div>
}
```

Correct:

```tsx
import { TreeView } from "@techsio/ui-kit/molecules/tree-view"
```

The first audit pass should inventory existing UI-kit components.

Source: libs/ui/skills/_artifacts/consumer_app_usage_rules.md

### HIGH Duplicated default style accepted

Wrong:

```tsx
<Button variant="danger" className="bg-danger text-fg-reverse px-200" />
```

Correct:

```tsx
<Button variant="danger" />
```

Do not allow className to restate what component props and tokens already do.

Source: libs/ui/skills/_artifacts/consumer_app_usage_rules.md

### HIGH Native HTML primitive remains

Wrong:

```tsx
<input className="border-input-border rounded-input-md" />
```

Correct:

```tsx
import { Input } from "@techsio/ui-kit/atoms/input"

<Input />
```

Use UI-kit primitives where possible so props and tokens remain centralized.

Source: libs/ui/skills/_artifacts/consumer_app_usage_rules.md

### MEDIUM Loading pattern drift

Wrong:

```tsx
<div className="h-8 animate-pulse rounded bg-gray-200" />
```

Correct:

```tsx
import { Skeleton } from "@techsio/ui-kit/atoms/skeleton"

<Skeleton />
```

Loading placeholders should use token-consistent Skeleton instead of ad-hoc
animated divs.

Source: libs/ui/skills/_artifacts/consumer_app_usage_rules.md

## Validation Commands

```sh
bunx biome check --write apps/<app>/src
```

Use the audit `rg` commands above before formatting.

