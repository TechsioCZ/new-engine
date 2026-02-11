---
name: ui-molecule-steps
description: Use when working with the @libs/ui Steps molecule (src/molecules/steps.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# Steps molecule
Use this skill to apply Steps correctly in UI work.

## Source Of Truth
- Read `src/molecules/steps.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `Steps`
- `StepsProps`
- `StepItem`

## Purpose
Zag steps for multi-step flows with optional controls and completion content.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | No | `string` | - | - |
| `items` | Yes | `StepItem[]` | - | - |
| `currentStep` | No | `number` | `0` | Sets Zag step. |
| `orientation` | No | `"horizontal"  &#124;  "vertical"` | `horizontal` | - |
| `linear` | No | `boolean` | `false` | - |
| `completeText` | No | `ReactNode` | - | - |
| `onStepChange` | No | `(step: number) => void` | - | - |
| `onStepComplete` | No | `() => void` | - | - |
| `className` | No | `string` | - | - |
| `showControls` | No | `boolean` | `true` | - |

## Compound API
No compound subcomponents are exposed.

## Controlled State
currentStep drives machine step; updates via onStepChange/onStepComplete.

## Semantics And Accessibility
Zag steps props on root/list/items/triggers/content; buttons for prev/next.

## Usage Pattern
```tsx
<Steps />
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
