---
name: component-usage-ux
description: >
  Use as the app-side UI-kit usage orchestrator. Chooses which @techsio/ui-kit
  component and per-component *-usage skill to load before selecting props,
  variants, themes, sizes, slots, framework adapters, and token overrides.
metadata:
  type: "composition"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
requires:
  - app-token-overrides
resources:
  - "../ux-guidelines/references/component-selection.md"
sources:
  - "libs/ui/skills/_artifacts/consumer_app_usage_rules.md"
  - "libs/ui/docs/component-contracts.md"
  - "https://zagjs.com/components/react/combobox"
---

# @techsio/ui-kit Component Usage UX

Use this in apps. It is a router, not a complete component manual.

Load order for any UI work:

```text
component-usage-ux  -> which component fits the intent
ux-guidelines       -> house UX rules: copy, dates/numbers, alignment, states,
                       where actions and feedback live, component selection
<component>-usage   -> the component API, plus its "UX/UI guidelines" section
```

## Setup

### Installed consumer (default)

Load the sibling `<component>-usage` skill from the installed skill library.
For a standalone plugin, resolve the following paths **from this SKILL.md's
folder**, never from the consuming application's current working directory:

- `../../references/consumer_app_usage_rules.md` — consumer rules.
- `../../references/component-contracts.md` — shared field/focus contracts.
- `../ux-guidelines/references/component-selection.md` — intent/component map.

The portable generator bundles the first two resources from their canonical
repository sources. In a source checkout, read the `sources` entries above.
Use the installed `@techsio/ui-kit/package.json` exports and the exported `.d.ts`
props (through editor/type navigation) to verify the **installed version**. No
`libs/ui/src`, `_artifacts`, monorepo checkout or kit build command is required.
For example, `React.ComponentProps<typeof Button>` checks the public Button API.

### Kit contributor only

When deliberately changing the kit in its source checkout, explore
`libs/ui/src/{atoms,molecules,organisms}` and `libs/ui/skills`. Source paths cited
as evidence below are contributor provenance, not installed-consumer prerequisites.
Run repository commands only for contributor work; app work uses its own type,
lint and test scripts. Never patch package internals in an installed app.

Then choose the exact skill:

```text
Button action -> button-usage
Dialog confirmation -> dialog-usage
Date or date-time selection -> date-picker-usage
Toast feedback -> toast-usage
Guided walkthrough -> tour-usage
Wizard/progress workflow -> steps-usage
Hierarchical choice -> cascade-select-usage
Nested site/category links -> vertical-navigation-usage
Tree widget with arrow-key selection -> tree-view-usage
Loading placeholder -> skeleton-usage
Catalog search navigation -> search-suggestions-usage
Catalog facet filtering -> facet-filter-panel-usage
Cart/order product row -> line-item-usage
Prepared amount breakdown and total -> totals-summary-usage
Quantity with unit/help/error/pending -> quantity-field-usage
Bare numeric draft or stepper -> numeric-input-usage
Shortcut hint or keyboard registration -> hotkeys-usage
Searchable action panel -> command-usage (plus dialog-usage for a modal shell)
```

## Core Patterns

### Start from UX intent

The full intent → component table (with the look-alikes to avoid) is
`../ux-guidelines/references/component-selection.md`.

```text
Destructive action -> Button danger, maybe Dialog confirmation
CRUD success/error -> Toast or StatusText depending persistence and context
Where the CRUD buttons go -> ux-guidelines (page actions top-right, form actions bottom-right)
Hierarchical form choice -> CascadeSelect
Hierarchical page/category navigation -> VerticalNavigation
Tree widget selection -> TreeView
Page trail -> Breadcrumb with framework link adapter when needed
```

Do not begin by writing native HTML.

### Verify props before use

Use the installed declaration for the component subpath, not a repository
search command. For example:

```tsx
import type { ComponentProps } from "react"
import { Button } from "@techsio/ui-kit/atoms/button"

type AppButtonProps = ComponentProps<typeof Button>
```

Never invent props such as `variant="ghost"` unless the installed public props
support them. Contributors may also inspect the matching TSX source.

### Read Zag docs for Zag-backed components

```text
Combobox usage
-> inspect the installed @techsio/ui-kit/molecules/combobox declaration
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

Contributor provenance: libs/ui/skills/_artifacts/skill_spec.md

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
Read combobox-usage, the installed Combobox props, and
https://zagjs.com/components/react/combobox before deciding whether the UI-kit
API is missing anything.
```

Zag docs explain the machine props and anatomy behind our wrapper; skipping
them causes unnecessary custom primitives.

Source: https://zagjs.com/components/react/combobox

## Consumer validation

Run the consuming app's typecheck/lint/tests. Optionally audit its source folder
(replace `src` with that app's actual source path):

```sh
rg -n '<button|<input|<select|<textarea|animate-pulse|variant="ghost"' src
rg -n 'className=.*(bg-|text-|font-|px-|py-|rounded-)' src
```
