---
name: menu-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Menu for
  action, radio, checkbox, separator, or submenu items using the Zag.js menu
  wrapper, Button trigger, icons, and supported open/highlight/select props.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - app-token-overrides
sources:
  - "libs/ui/src/molecules/menu.tsx"
  - "libs/ui/src/tokens/components/molecules/_menu.css"
  - "libs/ui/stories/molecules/menu.stories.tsx"
  - "libs/ui/src/molecules/figma/menu.figma.tsx"
  - "https://zagjs.com/components/react/menu"
---

# @techsio/ui-kit Menu Usage

Use Menu for contextual command lists. Use Select for choosing a value in a
form, Tabs for switching panels, and Popover for custom content.

## Setup

```tsx
import { Menu, type MenuItem } from "@techsio/ui-kit/molecules/menu"

const items: MenuItem[] = [
  { type: "action", value: "edit", label: "Edit", icon: "token-icon-edit" },
  { type: "separator", id: "main" },
  { type: "action", value: "delete", label: "Delete" },
]

<Menu items={items} onSelect={({ value }) => runAction(value)} />
```

Supported item types:

```text
action: value, label, icon, disabled
radio: value, label, name, checked
checkbox: value, label, checked
separator: id
submenu: value, label, icon, disabled, items
```

## Core Patterns

### Model menu items as data

Use `MenuItem[]`; do not render custom `<li>` elements in apps.

### Use menu for commands

Menu actions should trigger commands. For destructive commands, pair with
Dialog confirmation when needed.

### Use customTrigger carefully

Prefer the default Button trigger. If custom trigger is needed, pass a valid
React element so Zag trigger props can be cloned onto it.

## Common Mistakes

### HIGH Custom dropdown command list

Wrong:

```tsx
<Button onClick={toggle}>Actions</Button>{open && <ul><li>Edit</li></ul>}
```

Correct:

```tsx
<Menu items={items} onSelect={handleSelect} />
```

Source: libs/ui/src/molecules/menu.tsx

### HIGH Invented item type

Wrong:

```tsx
{ type: "danger", value: "delete", label: "Delete" }
```

Correct:

```tsx
{ type: "action", value: "delete", label: "Delete" }
```

Source: libs/ui/src/molecules/menu.tsx

### HIGH Inline item styling

Wrong:

```tsx
<Menu items={items} className="rounded bg-white p-2 shadow" />
```

Correct:

```tsx
<Menu items={items} size="md" />
```

Source: libs/ui/src/tokens/components/molecules/_menu.css

## Validation Commands

```sh
rg -n "role=\"menu\"|<ul[^>]*className=.*(absolute|shadow)|type: \"(danger|link|item)\"" apps
rg -n "<Menu[^>]*className=.*(bg-|text-|rounded-|p-|shadow-)" apps
rg -n "customTrigger=|type: \"submenu\"|onCheckedChange" apps
```

