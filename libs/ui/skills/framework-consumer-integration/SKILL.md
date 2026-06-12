---
name: framework-consumer-integration
description: >
  Use when consuming @techsio/ui-kit in framework apps, especially Next.js 16+
  with React Compiler, NextLink, NextImage, token CSS imports, polymorphic `as`
  props, adapter prop forwarding, and wrapper-avoidance checks.
type: framework
framework: react
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
sources:
  - "libs/ui/skills/_artifacts/consumer_app_usage_rules.md"
  - "libs/ui/package.json"
  - "libs/ui/src/atoms/link.tsx"
  - "libs/ui/src/atoms/link-button.tsx"
  - "libs/ui/src/atoms/image.tsx"
  - "libs/ui/src/molecules/breadcrumb.tsx"
  - "libs/ui/src/molecules/pagination.tsx"
---

This skill builds on `component-usage-ux`. Read it first for component
selection before applying framework adapters.

# @techsio/ui-kit Framework Consumer Integration

Use this in React/Next app consumers.

## Setup

Next apps should prefer framework-native adapters:

```tsx
import NextImage from "next/image"
import NextLink from "next/link"
import { Image } from "@techsio/ui-kit/atoms/image"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"

export function ProductCta() {
  return (
    <>
      <Image alt="Product" as={NextImage} height={320} src="/product.jpg" width={320} />
      <LinkButton as={NextLink} href="/products">
        View products
      </LinkButton>
    </>
  )
}
```

## Core Patterns

### Use agnostic Link and Image as adapter-capable primitives

```tsx
<Image as={NextImage} alt="Hero" height={600} src="/hero.jpg" width={1200} />
<LinkButton as={NextLink} href="/checkout">Checkout</LinkButton>
```

In Next apps, default to `NextImage` and `NextLink` when rendering app pages.

### Pass adapters through molecules

```tsx
<Breadcrumb.Link as={NextLink} href="/products">
  Products
</Breadcrumb.Link>
```

Molecules should preserve link/image props instead of forcing native anchors or
images.

### Avoid memoization cargo-culting

```text
Next 16+ apps use React Compiler.
Do not add useCallback/useMemo around UI-kit handlers by default.
```

Only memoize when a real identity or performance issue is proven.

## Common Mistakes

### HIGH Agnostic Link/Image used directly in Next

Wrong:

```tsx
<Image alt="Product" src="/product.jpg" />
<Link href="/products">Products</Link>
```

Correct:

```tsx
<Image as={NextImage} alt="Product" height={320} src="/product.jpg" width={320} />
<LinkButton as={NextLink} href="/products">Products</LinkButton>
```

UI-kit Link/Image are framework-agnostic; Next apps should use adapters.

Source: libs/ui/skills/_artifacts/consumer_app_usage_rules.md

### HIGH Missing token imports

Wrong:

```css
/* app global CSS has no UI-kit token import */
```

Correct:

```css
@import "@techsio/ui-kit/tokens-with-tailwind";
```

UI-kit component classes need the token CSS loaded in the app.

Source: libs/ui/package.json

### HIGH Adapter prop mismatch

Wrong:

```tsx
<Breadcrumb.Link href={{ pathname: "/products" } as string}>
  Products
</Breadcrumb.Link>
```

Correct:

```tsx
<Breadcrumb.Link as={NextLink} href={{ pathname: "/products" }}>
  Products
</Breadcrumb.Link>
```

The generic `as` prop lets framework href types flow from the adapter.

Source: libs/ui/src/molecules/breadcrumb.tsx

### MEDIUM Wrapper before API check

Wrong:

```tsx
function NextLinkButton(props: NextLinkProps) {
  return <NextLink className="bg-primary px-200" {...props} />
}
```

Correct:

```tsx
<LinkButton as={NextLink} href="/account" variant="primary" theme="solid">
  Account
</LinkButton>
```

Do not create wrappers until supported adapter props and UI-kit props have been
checked.

Source: libs/ui/src/atoms/link-button.tsx

## Validation Commands

```sh
rg -n '@techsio/ui-kit/atoms/(link|image)|<Link |<Image ' apps/<app>
rg -n 'as=\\{Next(Link|Image)\\}|from "next/(link|image)"' apps/<app>
rg -n '@techsio/ui-kit/tokens' apps/<app>
```

