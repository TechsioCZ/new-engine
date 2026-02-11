---
name: ui-molecule-breadcrumb
description: Use when working with the @libs/ui Breadcrumb molecule (src/molecules/breadcrumb.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# Breadcrumb molecule
Use this skill to apply Breadcrumb correctly in UI work.

## Source Of Truth
- Read `src/molecules/breadcrumb.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `Breadcrumb`
- `BreadcrumbItemType`

## Purpose
Render breadcrumb navigation from items array with optional truncation/ellipsis.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `items` | Yes | `BreadcrumbItemType[]` | - | - |
| `maxItems` | No | `number` | `0` | 0 or less shows all. |
| `size` | No | `"sm"  &#124;  "md"  &#124;  "lg"` | `md` | Variant prop. |
| `className` | No | `string` | - | - |
| `aria-label` | No | `string` | `breadcrumb` | - |
| `linkAs` | No | `ElementType  &#124;  ReactElement<HTMLAnchorElement>` | - | - |

## Compound API
No compound subcomponents are exposed.

## Controlled State
No explicit controlled/uncontrolled mode is documented.

## Semantics And Accessibility
Wraps list in <nav aria-label>; current item uses aria-current="page"; ellipsis icon is aria-hidden.

## Usage Pattern
```tsx
<Breadcrumb />
```

## UI/UX Rules
- Use this component instead of raw HTML when an equivalent molecule exists.
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
