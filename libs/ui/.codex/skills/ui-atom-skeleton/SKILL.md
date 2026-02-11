---
name: ui-atom-skeleton
description: Use when working with the @libs/ui Skeleton atom (src/atoms/skeleton.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# Skeleton atom
Use this skill to apply Skeleton correctly in UI work.

## Source Of Truth
- Read `src/atoms/skeleton.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `Skeleton`

## Purpose
Loading placeholders with optional circle, text, and rectangle variants.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `isLoaded` | No | `boolean` | `false` | When true, renders children instead of skeleton. |
| `variant` | No | `"primary" &#124; "secondary"` | `primary` | - |
| `speed` | No | `"slow" &#124; "normal" &#124; "fast"` | `normal` | - |
| `children` | No | `ReactNode` | - | - |

## Compound API
- `Skeleton.Circle`
- `Skeleton.Text`
- `Skeleton.Rectangle`

## Controlled State
isLoaded controls rendering; context provides default variant/speed/isLoaded for subcomponents.

## Semantics And Accessibility
When loading, renders elements with aria-busy="true" and aria-label="Loading content".

## Usage Pattern
```tsx
<Skeleton>
  <Skeleton.Circle>...</Skeleton.Circle>
  <Skeleton.Text>...</Skeleton.Text>
</Skeleton>
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
