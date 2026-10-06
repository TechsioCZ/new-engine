---
name: link-button-usage
description: >
  Use after component-usage-ux when navigation should look like a Button using
  @techsio/ui-kit LinkButton, including framework link adapters, href, disabled
  state, icons, and Button-compatible variants/themes/sizes.
metadata:
  component_version: "1.0.0"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
requires:
  - component-usage-ux
  - framework-consumer-integration
  - app-token-overrides
  - ux-guidelines
sources:
  - "libs/ui/src/atoms/link-button.tsx"
  - "libs/ui/src/atoms/link.tsx"
  - "libs/ui/src/atoms/button.tsx"
  - "libs/ui/src/tokens/components/atoms/_button.css"
  - "libs/ui/src/atoms/link-button.figma.ts"
---

# @techsio/ui-kit LinkButton Usage

Use LinkButton for navigation that needs Button styling. Use Button for
actions that stay in the current page state.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `LinkButton`.

**Use it when**

- Navigation that must look like a button: `Go to checkout`, `View order`, CTA on marketing pages, `Back to list` when it is a real URL.

**Use something else when**

| Need | Use instead |
| --- | --- |
| An action that stays on the page | Button |
| A link inside text or lists | Link |

**Do**

- Label with the destination or intent (`View order`, `Continue shopping`).
- Follow Button hierarchy: one primary per surface.
- Use the framework link adapter so client routing and prefetch work.

**Don't**

- Use LinkButton to submit forms or trigger mutations.
- Open new tabs without saying so (`opens in a new tab`).

**Copy and states**

- No `Click here` / `Learn more` without context; `Read the returns policy` instead.

## Setup

```tsx
import NextLink from "next/link"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"

<LinkButton as={NextLink} href="/products" variant="primary" theme="solid">
  Products
</LinkButton>
```

Supported LinkButton-specific props:

```text
as: React element type
href: string
disabled: boolean
variant/theme/size/block/uppercase: Button visual props
icon/iconPosition/iconSize: Button icon props
```

## Core Patterns

### Use for navigational CTA

```tsx
<LinkButton as={NextLink} href="/checkout" variant="primary">
  Checkout
</LinkButton>
```

If clicking submits, deletes, saves, opens a dialog, or mutates state, use
Button instead.

### Use framework adapters directly

```tsx
<LinkButton as={NextLink} href="/account/orders" theme="outlined">
  Orders
</LinkButton>
```

Do not create a local wrapper until `framework-consumer-integration` proves the
component cannot accept the framework prop shape.

### Reuse Button visual semantics

```text
danger -> destructive navigation such as leave/cancel flow
borderless -> low-emphasis navigation action
current -> inherit size from parent surface
```

The visual props come from Button variants and tokens.

## Common Mistakes

### HIGH Button used for route navigation

Wrong:

```tsx
<Button onClick={() => router.push("/products")}>Products</Button>
```

Correct:

```tsx
<LinkButton as={NextLink} href="/products">Products</LinkButton>
```

Source: libs/ui/src/atoms/link-button.tsx

### HIGH Native anchor styled like a button

Wrong:

```tsx
<a href="/checkout" className="rounded bg-primary px-4 py-2 text-white">
  Checkout
</a>
```

Correct:

```tsx
<LinkButton as={NextLink} href="/checkout" variant="primary">
  Checkout
</LinkButton>
```

Source: libs/ui/src/tokens/components/atoms/_button.css

### HIGH Hallucinated button prop

Wrong:

```tsx
<LinkButton href="/help" variant="ghost">Help</LinkButton>
```

Correct:

```tsx
<LinkButton href="/help" variant="secondary" theme="borderless">
  Help
</LinkButton>
```

Source: libs/ui/src/atoms/button.tsx

### MEDIUM Wrapper before adapter check

Wrong:

```tsx
function AppLinkButton(props: Props) {
  return <NextLink className="btn-primary" {...props} />
}
```

Correct:

```tsx
<LinkButton as={NextLink} href="/profile">Profile</LinkButton>
```

## Validation Commands

```sh
rg -n "<Button[^>]*onClick=.*router\\.push|<a[^>]*className=.*(bg-|px-|py-)" apps
rg -n "<LinkButton[^>]*variant=\"ghost\"" apps
rg -n "<LinkButton[^>]*className=.*(bg-|text-|px-|py-|rounded-|border-)" apps
rg -n "function .*LinkButton|const .*LinkButton" apps
```

