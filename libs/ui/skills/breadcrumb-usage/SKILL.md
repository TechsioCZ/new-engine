---
name: breadcrumb-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Breadcrumb for
  page hierarchy navigation with Link/NextLink adapters, current page state,
  separators, ellipsis, icons, size, and underline variant.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - framework-consumer-integration
  - app-token-overrides
sources:
  - "libs/ui/src/molecules/breadcrumb.tsx"
  - "libs/ui/src/tokens/components/molecules/_breadcrumb.css"
  - "libs/ui/stories/molecules/breadcrumb.stories.tsx"
  - "libs/ui/src/molecules/figma/breadcrumb.figma.tsx"
---

# @techsio/ui-kit Breadcrumb Usage

Use Breadcrumb for location hierarchy, not for primary navigation tabs.

## Setup

```tsx
import NextLink from "next/link"
import { Breadcrumb } from "@techsio/ui-kit/molecules/breadcrumb"

<Breadcrumb size="md">
  <Breadcrumb.List>
    <Breadcrumb.Item><Breadcrumb.Link as={NextLink} href="/">Home</Breadcrumb.Link></Breadcrumb.Item>
    <Breadcrumb.Separator />
    <Breadcrumb.Item><Breadcrumb.CurrentLink>Products</Breadcrumb.CurrentLink></Breadcrumb.Item>
  </Breadcrumb.List>
</Breadcrumb>
```

Supported props:

```text
Breadcrumb: size sm | md | lg, variant plain | underline
Link: as, href, external, framework link props
CurrentLink: aria-current page
Separator/Ellipsis/Icon: token icon defaults with icon override props
```

## Core Patterns

### Use CurrentLink for the current page

The last breadcrumb should be `Breadcrumb.CurrentLink`, not a clickable link to
the same page.

### Use framework link adapters

In Next apps, pass `as={NextLink}` to `Breadcrumb.Link` instead of wrapping or
restyling anchors.

### Use separators and ellipsis components

Let `Breadcrumb.Separator` and `Breadcrumb.Ellipsis` supply token icons and
ARIA behavior.

## Common Mistakes

### HIGH Native breadcrumb markup

Wrong:

```tsx
<nav><a href="/">Home</a> / <span>Products</span></nav>
```

Correct:

```tsx
<Breadcrumb><Breadcrumb.List>{/* items */}</Breadcrumb.List></Breadcrumb>
```

Source: libs/ui/src/molecules/breadcrumb.tsx

### HIGH Missing framework adapter

Wrong:

```tsx
<Breadcrumb.Link href="/products">Products</Breadcrumb.Link>
```

Correct in Next:

```tsx
<Breadcrumb.Link as={NextLink} href="/products">Products</Breadcrumb.Link>
```

Source: libs/ui/src/atoms/link.tsx

### MEDIUM Inline separator or text styling

Wrong:

```tsx
<span className="mx-2 text-gray-400">/</span>
```

Correct:

```tsx
<Breadcrumb.Separator />
```

Source: libs/ui/src/tokens/components/molecules/_breadcrumb.css

## Validation Commands

```sh
rg -P -n "<nav[^>]*breadcrumb|/ <span|<Breadcrumb\\.Link(?![^>]*as=)" apps
rg -P -n "<Breadcrumb\\.Link(?![^>]*as=\\{?NextLink)" apps
rg -n "<Breadcrumb[^>]*className=.*(gap-|text-|px-|py-)" apps
```
