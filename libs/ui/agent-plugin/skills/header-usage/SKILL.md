---
name: header-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Header for
  responsive site header composition with desktop/mobile sections, containers,
  nav, nav items, actions, hamburger, active state, size, direction, and token
  styling.
metadata:
  component_version: "1.0.0"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-usage-ux framework-consumer-integration app-token-overrides ux-guidelines"
  sources: "libs/ui/src/organisms/header.tsx libs/ui/src/tokens/components/organisms/_header.css libs/ui/stories/organisms/header.stories.tsx"
---

# @techsio/ui-kit Header Usage

Use Header for global page header/navigation layout. Compose it with Link or
LinkButton for actual navigation items.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `Header`.

**Use it when**

- The global top bar: logo, primary navigation, search, account, cart.

**Use something else when**

| Need | Use instead |
| --- | --- |
| In-app admin navigation with many destinations | Sidebar + VerticalNavigation |
| Page-level title and actions | the page header inside content (title + top-right actions) |

**Do**

- Keep the same order across pages: logo start, navigation, search, account/cart end.
- Show cart count and account state; collapse navigation to a Drawer/Sidebar below `lg`.
- Make it sticky only if it stays compact; ensure it never covers focused content (scroll-padding).

**Don't**

- Put page-specific actions in the global header.
- Hide search behind an icon on desktop storefronts where search is a primary task.

**Copy and states**

- Navigation labels are short nouns; icon buttons have labels (`Cart, 3 items`, `Account`).

## Setup

```tsx
<Header size="md">
  <Header.Desktop>
    <Header.Container position="start">
      <Header.Nav>
        <Header.NavItem active><Link as={NextLink} href="/">Home</Link></Header.NavItem>
      </Header.Nav>
      <Header.Actions><Header.ActionItem><Button>Account</Button></Header.ActionItem></Header.Actions>
    </Header.Container>
  </Header.Desktop>
  <Header.Hamburger />
  <Header.Mobile position="right">{/* mobile nav */}</Header.Mobile>
</Header>
```

Supported props:

```text
Header size: sm | md | lg
direction: vertical | horizontal
Container position: start | center | end
Mobile position: left | right
NavItem active
parts: Desktop, Mobile, Container, Nav, NavItem, Actions, ActionItem, Hamburger
```

## Core Patterns

### Use Header.Hamburger for mobile menu state

Do not duplicate mobile state externally unless the current Header API cannot
support the UX.

### Put links/buttons inside slots

Header slots provide layout and token styling; Link/LinkButton/Button provide
navigation/action semantics.

### Use active on NavItem

Set `active` based on current route; do not style active nav with classes.

## Common Mistakes

### HIGH Raw responsive header

Wrong:

```tsx
<header className="flex justify-between"><button onClick={toggle}>Menu</button></header>
```

Correct:

```tsx
<Header><Header.Hamburger /><Header.Mobile /></Header>
```

Source: libs/ui/src/organisms/header.tsx

### HIGH Active nav styled inline

Wrong:

```tsx
<Header.NavItem className="font-bold text-primary">Home</Header.NavItem>
```

Correct:

```tsx
<Header.NavItem active>Home</Header.NavItem>
```

Source: libs/ui/src/tokens/components/organisms/_header.css

### HIGH Native nav action instead of component

Wrong:

```tsx
<a className="px-3 py-2" href="/cart">Cart</a>
```

Correct:

```tsx
<Link as={NextLink} href="/cart">Cart</Link>
```

## Validation Commands

```sh
rg -n "<header\\b|setIsMobileMenuOpen|toggleMobile|<Header\\.NavItem[^>]*className=.*(font-|text-|bg-)" apps
rg -n "<a[^>]*href=|<Header\\.Hamburger|<Header\\.Mobile" apps
rg -n "<Header[^>]*size=\"(xs|xl)\"|position=\"(left|right)\".*Header\\.Container" apps
```

