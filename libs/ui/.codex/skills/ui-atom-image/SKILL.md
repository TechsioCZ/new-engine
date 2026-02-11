---
name: ui-atom-image
description: Use when working with the @libs/ui Image atom (src/atoms/image.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# Image atom
Use this skill to apply Image correctly in UI work.

## Source Of Truth
- Read `src/atoms/image.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `BaseImageProps`
- `ImageProps`
- `Image`

## Purpose
Typed image wrapper with optional polymorphic element.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `src` | Yes | `string` | - | - |
| `alt` | Yes | `string` | - | - |
| `as` | No | `ElementType` | `img` | Only allowed when target supports src and alt. |
| `className` | No | `string` | - | - |

## Compound API
No compound subcomponents are exposed.

## Controlled State
No explicit controlled/uncontrolled mode is documented.

## Semantics And Accessibility
Renders an element with src/alt; for <img> alt is required.

## Usage Pattern
```tsx
<Image />
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
