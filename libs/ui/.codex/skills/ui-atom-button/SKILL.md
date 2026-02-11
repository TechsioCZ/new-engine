---
name: ui-atom-button
description: Use when working with the @libs/ui Button atom (src/atoms/button.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# Button atom
Use this skill to apply Button correctly in UI work.

## Source Of Truth
- Read `src/atoms/button.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `buttonVariants`
- `ButtonProps`
- `Button`

## Purpose
Action button with variants, sizes, icons, and loading state.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `variant` | No | `"primary" &#124; "secondary" &#124; "tertiary" &#124; "danger" &#124; "warning"` | `primary` | Styling variant. |
| `theme` | No | `"solid" &#124; "light" &#124; "borderless" &#124; "outlined" &#124; "unstyled"` | `solid` | Styling theme. |
| `size` | No | `"sm" &#124; "md" &#124; "lg" &#124; "current"` | `md` | Size and spacing. |
| `block` | No | `boolean` | - | Full-width when true. |
| `uppercase` | No | `boolean` | `false` | Uppercase text when true. |
| `icon` | No | `IconType` | - | Optional leading/trailing icon. |
| `iconPosition` | No | `"left" &#124; "right"` | `"left"` | Icon placement. |
| `isLoading` | No | `boolean` | - | Shows spinner and disables button when true. |
| `loadingText` | No | `string` | - | Overrides children text while loading. |
| `children` | No | `ReactNode` | - | - |

## Compound API
No compound subcomponents are exposed.

## Controlled State
Disabled state is derived from isLoading or disabled prop.

## Semantics And Accessibility
Renders a <button> with disabled attribute when disabled or loading.

## Usage Pattern
```tsx
<Button />
```

## UI/UX Rules
- Use this component instead of raw HTML when an equivalent atom exists.
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
