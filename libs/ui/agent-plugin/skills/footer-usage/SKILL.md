---
name: footer-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Footer for
  site footer composition with container, section, title, list, link, text,
  divider, bottom area, size, layout, direction, section flow, and framework
  link adapters.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - framework-consumer-integration
  - app-token-overrides
sources:
  - "libs/ui/src/organisms/footer.tsx"
  - "libs/ui/src/tokens/components/organisms/_footer.css"
  - "libs/ui/stories/organisms/footer.stories.tsx"
---

# @techsio/ui-kit Footer Usage

Use Footer for global footer layout. Do not build app footers from raw divs and
anchors when this organism fits.

## Setup

```tsx
import NextLink from "next/link"
import { Footer } from "@techsio/ui-kit/organisms/footer"

<Footer size="md">
  <Footer.Container>
    <Footer.Section>
      <Footer.Title>Shop</Footer.Title>
      <Footer.List>
        <li><Footer.Link as={NextLink} href="/products">Products</Footer.Link></li>
      </Footer.List>
    </Footer.Section>
    <Footer.Bottom><Footer.Text>(c) Techsio</Footer.Text></Footer.Bottom>
  </Footer.Container>
</Footer>
```

Supported props:

```text
Footer size: sm | md | lg
direction: vertical | horizontal
layout: col | row
sectionFlow: col | row
Link: href/external/as framework adapter
parts: Container, Section, Title, List, Link, Text, Divider, Bottom
```

## Core Patterns

### Use Footer.Link for footer navigation

It wraps the UI-kit Link atom and supports framework adapters.

### Use sections for groups

Group footer columns with `Footer.Section`, `Footer.Title`, and `Footer.List`.

### Let footer tokens define density

Use `size`, `layout`, and `sectionFlow` instead of local gap/padding classes.

## Common Mistakes

### HIGH Raw footer layout

Wrong:

```tsx
<footer className="grid gap-8 p-8"><a href="/products">Products</a></footer>
```

Correct:

```tsx
<Footer><Footer.Container><Footer.Section><Footer.Link href="/products">Products</Footer.Link></Footer.Section></Footer.Container></Footer>
```

Source: libs/ui/src/organisms/footer.tsx

### HIGH Missing NextLink adapter

Wrong:

```tsx
<Footer.Link href="/products">Products</Footer.Link>
```

Correct in Next:

```tsx
<Footer.Link as={NextLink} href="/products">Products</Footer.Link>
```

Source: libs/ui/src/atoms/link.tsx

### HIGH Inline footer spacing/colors

Wrong:

```tsx
<Footer.Container className="grid grid-cols-4 gap-6 bg-slate-900 p-8" />
```

Correct:

```tsx
<Footer layout="col" size="lg"><Footer.Container /></Footer>
```

Source: libs/ui/src/tokens/components/organisms/_footer.css

## Validation Commands

```sh
rg -n "<footer\\b|<Footer\\.(Container|Section|Link)[^>]*className=.*(grid|gap-|p-|bg-|text-)" apps
rg -P -n "<Footer\\.Link(?![^>]*as=\\{?NextLink)" apps
rg -n "<Footer[^>]*size=\"(xs|xl)\"|layout=\"(grid|columns)\"" apps
```
