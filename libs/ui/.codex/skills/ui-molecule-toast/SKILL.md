---
name: ui-molecule-toast
description: Use when working with the @libs/ui Toast molecule (src/molecules/toast.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# Toast molecule
Use this skill to apply Toast correctly in UI work.

## Source Of Truth
- Read `src/molecules/toast.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `Toast`
- `ToastContainerProps`
- `toaster`
- `Toaster`
- `useToast`

## Purpose
Toast system: create toasts via `useToast()`/`toaster`, render `<Toaster />` to display.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `actor` | Yes | `toast.Options<ReactNode>` | - | - |
| `index` | Yes | `number` | - | - |
| `parent` | Yes | `toast.GroupService` | - | - |
| `placement` | No | `toast.Placement` | - | - |

## Compound API
No compound subcomponents are exposed.

## Controlled State
No explicit controlled/uncontrolled mode is documented.

## Semantics And Accessibility
Zag toast props applied to root/title/description/close trigger; portal for group.

## Usage Pattern
```tsx
<Toast />
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
