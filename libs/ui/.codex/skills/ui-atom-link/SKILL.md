---
name: ui-atom-link
description: Use when working with the @libs/ui Link atom (src/atoms/link.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# Link atom
Use this skill to apply Link correctly in UI work.

## Source Of Truth
- Read `src/atoms/link.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `BaseLinkProps`
- `NativeLinkProps`
- `LinkProps`
- `Link`

## Purpose
Generic link with optional external handling and polymorphic target.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `external` | No | `boolean` | `false` | Adds target="_blank" and rel="noopener noreferrer" when true and using <a>. |
| `as` | No | `ElementType` | `a` | - |
| `children` | Yes | `ReactNode` | - | - |

## Compound API
No compound subcomponents are exposed.

## Controlled State
No explicit controlled/uncontrolled mode is documented.

## Semantics And Accessibility
Renders an element (default <a>); adds target and rel when external and using <a>.

## Usage Pattern
```tsx
<Link />
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
