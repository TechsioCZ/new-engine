---
name: link-usage
description: >
  Use after component-usage-ux when an app needs the low-level
  @techsio/ui-kit Link atom for inline or unstyled navigation, including
  external links and framework adapter usage.
metadata:
  component_version: "1.0.0"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-usage-ux framework-consumer-integration ux-guidelines"
  sources: "libs/ui/src/atoms/link.tsx libs/ui/src/atoms/link-button.tsx libs/ui/src/atoms/link.figma.ts"
---

# @techsio/ui-kit Link Usage

Use Link for inline navigation or when a molecule needs a framework-agnostic
link. Use LinkButton when the link should look like a button.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `Link`.

**Use it when**

- Navigation inside text, lists, tables (record names), breadcrumbs and footers.

**Use something else when**

| Need | Use instead |
| --- | --- |
| Navigation styled as a button | LinkButton |
| An action | Button |

**Do**

- Make link text describe the destination; in tables, link the record name, not a separate `View` column.
- Mark external links and links that download files.
- Keep underline or another non-colour cue for links inside text.

**Don't**

- Use links for actions (`Delete`).
- Make whole cards clickable while also nesting other links inside.

**Copy and states**

- Destination-first, sentence case; no `here`.

## Setup

```tsx
import NextLink from "next/link"
import { Link } from "@techsio/ui-kit/atoms/link"

<Link as={NextLink} href="/terms">
  Terms
</Link>
```

Supported props:

```text
as: React element type
external: boolean
href and other props from the chosen element/component
```

## Core Patterns

### Use external for off-site links

```tsx
<Link href="https://example.com" external>
  External docs
</Link>
```

`external` sets safe target/rel defaults unless they are explicitly supplied.

### Use NextLink in Next apps

```tsx
<Link as={NextLink} href="/account">
  Account
</Link>
```

Default to the framework link adapter in Next apps.

### Escalate styled CTA to LinkButton

```tsx
<LinkButton as={NextLink} href="/checkout" variant="primary">
  Checkout
</LinkButton>
```

Do not build button visual styling on top of Link.

## Common Mistakes

### HIGH Native anchor for normal app link

Wrong:

```tsx
<a href="/account">Account</a>
```

Correct:

```tsx
<Link as={NextLink} href="/account">Account</Link>
```

Source: libs/ui/src/atoms/link.tsx

### HIGH Link styled as button

Wrong:

```tsx
<Link href="/checkout" className="rounded bg-primary px-4 py-2 text-white">
  Checkout
</Link>
```

Correct:

```tsx
<LinkButton href="/checkout" variant="primary">Checkout</LinkButton>
```

Source: libs/ui/src/atoms/link-button.tsx

### MEDIUM External link without external prop

Wrong:

```tsx
<Link href="https://vendor.example">Vendor</Link>
```

Correct:

```tsx
<Link href="https://vendor.example" external>Vendor</Link>
```

Source: libs/ui/src/atoms/link.tsx

### MEDIUM Custom framework wrapper

Wrong:

```tsx
const AppLink = (props: Props) => <NextLink className="underline" {...props} />
```

Correct:

```tsx
<Link as={NextLink} href="/blog">Blog</Link>
```

## Validation Commands

```sh
rg -n "<a\\b|<Link[^>]*className=.*(bg-|px-|py-|rounded-)" apps
rg -P -n "<Link[^>]*href=\"https?://(?![^>]*external)" apps
rg -n "function .*Link|const .*Link" apps
rg -n "<LinkButton|<Link\\b" apps
```
