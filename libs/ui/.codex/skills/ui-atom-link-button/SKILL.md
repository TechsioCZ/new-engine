---
name: ui-atom-link-button
description: Use when working with the @libs/ui LinkButton atom (src/atoms/link-button.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# LinkButton atom
Use this skill to apply LinkButton correctly in UI work.

## Source Of Truth
- Read `src/atoms/link-button.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `LinkButtonProps`
- `LinkButton`

## Purpose
Link styled as a button, with optional icon and disabled handling.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `href` | No | `string` | - | Omitted when disabled. |
| `icon` | No | `IconType` | - | - |
| `iconPosition` | No | `"left" &#124; "right"` | `"left"` | - |
| `disabled` | No | `boolean` | - | Also sets aria-disabled and prevents navigation. |
| `uppercase` | No | `boolean` | - | - |
| `as` | No | `ElementType &#124; ReactElement<HTMLAnchorElement>` | `a` | - |
| `variant` | No | `"primary" &#124; "secondary" &#124; "tertiary" &#124; "danger" &#124; "warning"` | `primary` | - |
| `theme` | No | `"solid" &#124; "light" &#124; "borderless" &#124; "outlined" &#124; "unstyled"` | `solid` | - |
| `size` | No | `"sm" &#124; "md" &#124; "lg" &#124; "current"` | `current` | - |
| `block` | No | `boolean` | - | - |
| `children` | No | `ReactNode` | - | - |

## Compound API
No compound subcomponents are exposed.

## Controlled State
No explicit controlled/uncontrolled mode is documented.

## Semantics And Accessibility
Renders Link (default <a>); sets aria-disabled and tabIndex=-1 when disabled; prevents click when disabled.

## Usage Pattern
```tsx
<LinkButton />
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
