---
name: ui-organism-header
description: Use when working with the @libs/ui Header organism (src/organisms/header.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# Header organism
Use this skill to apply Header correctly in UI work.

## Source Of Truth
- Read `src/organisms/header.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `Header`
- `HeaderContext`
- `HeaderProps`

## Purpose
Site header layout with desktop/mobile containers, nav, actions, and hamburger toggle via compound subcomponents.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `children` | Yes | `ReactNode` | - | Rendered inside <header>. |
| `size` | No | `"sm"  &#124;  "md"  &#124;  "lg"` | `md` | Variant prop; stored in context for subcomponents. |
| `direction` | No | `"vertical"  &#124;  "horizontal"` | `horizontal` | Variant prop; affects root layout. |
| `className` | No | `string` | - | Passed to headerVariants root. |
| `ref` | No | `Ref<HTMLElement>` | - | Forwarded to <header>. |

## Compound API
- `Header.Desktop`
- `Header.Mobile`
- `Header.Container`
- `Header.Nav`
- `Header.NavItem`
- `Header.Actions`
- `Header.ActionItem`
- `Header.Hamburger`

## Controlled State
Mobile menu open state is internal via useState; no external control props. Subcomponents read context size and mobile menu state.

## Semantics And Accessibility
Uses semantic <header>, <nav>, <section>; hamburger is a Button with aria-label and aria-expanded; mobile menu state reflected via data attributes.

## Usage Pattern
```tsx
<Header>
  <Header.Desktop>...</Header.Desktop>
  <Header.Mobile>...</Header.Mobile>
</Header>
```

## UI/UX Rules
- Use this component instead of raw HTML when an equivalent organism exists.
- Keep labels, help text, and error feedback explicit; never rely on color alone.
- Prefer predictable defaults first, then opt into advanced props only when needed.
- Preserve keyboard and screen-reader behavior provided by the implementation.
- Keep visual consistency by using component variants and sizes before custom classes.

## Integration Checklist
- Verify required props first.
- Verify semantic structure in rendered markup.
- Verify focus, keyboard navigation, and disabled/read-only behavior.
- Verify controlled/uncontrolled mode is used consistently.
- Verify Storybook examples cover primary and stateful cases.
