---
name: breadcrumb-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Breadcrumb for
  page hierarchy navigation with Link/NextLink adapters, current page state,
  separators, ellipsis, icons, size, and underline variant.
metadata:
  component_version: "1.0.1"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
requires:
  - component-usage-ux
  - framework-consumer-integration
  - app-token-overrides
  - ux-guidelines
sources:
  - "libs/ui/src/molecules/breadcrumb.tsx"
  - "libs/ui/src/tokens/components/molecules/_breadcrumb.css"
  - "libs/ui/stories/molecules/breadcrumb.stories.tsx"
  - "libs/ui/src/molecules/breadcrumb.figma.ts"
---

# @techsio/ui-kit Breadcrumb Usage

Use Breadcrumb for location hierarchy, not for primary navigation tabs.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `Breadcrumb`.

**Use it when**

- Pages three or more levels deep in a hierarchy (catalog → category → product; admin → section → record).
- Record editors and detail pages, so users can return to the list they came from.
- Storefront category and product pages, where it also helps SEO.

**Use something else when**

| Need | Use instead |
| --- | --- |
| Switching peer views | Tabs |
| Progress through a task | Steps |
| Primary site navigation | Header / Sidebar + VerticalNavigation |
| Browser-history back | a `Back to list` Button in the page header |

**Do**

- Start at the root users recognise (`Home` or the section), end with the current page as plain text (not a link).
- Mirror the information architecture, not the click history.
- Truncate the middle on small screens, never the current page.
- Use the same labels as the navigation and page titles.

**Don't**

- Link the current page to itself.
- Use breadcrumbs on top-level pages where they only contain `Home`.
- Replace the page title with the last breadcrumb — keep both.

**Copy and states**

- Labels are page names in sentence case; separators come from the component, never typed characters.

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
