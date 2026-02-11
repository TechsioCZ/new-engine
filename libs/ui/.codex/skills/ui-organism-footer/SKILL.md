---
name: ui-organism-footer
description: Use when working with the @libs/ui Footer organism (src/organisms/footer.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# Footer organism
Use this skill to apply Footer correctly in UI work.

## Source Of Truth
- Read `src/organisms/footer.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `Footer`

## Purpose
Site footer layout with container, sections, titles, links, text, lists, divider, and bottom area via compound subcomponents.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `children` | Yes | `ReactNode` | - | Rendered inside <footer>. |
| `size` | No | `"sm"  &#124;  "md"  &#124;  "lg"` | `md` | Variant prop; stored in context. |
| `direction` | No | `"vertical"  &#124;  "horizontal"` | `horizontal` | Variant prop for root layout. |
| `layout` | No | `"col"  &#124;  "row"` | `col` | Variant prop; stored in context for container. |
| `sectionFlow` | No | `"col"  &#124;  "row"` | `col` | Variant prop; stored in context for sections. |
| `className` | No | `string` | - | Passed to footerVariants root. |

## Compound API
- `Footer.Container`
- `Footer.Section`
- `Footer.Title`
- `Footer.Link`
- `Footer.Text`
- `Footer.List`
- `Footer.Divider`
- `Footer.Bottom`

## Controlled State
No internal state. Variants are set on Footer and consumed by subcomponents via context.

## Semantics And Accessibility
Uses semantic <footer>, <h3>, <p>, <ul>, <hr>; links are rendered with <Link> (anchor).

## Usage Pattern
```tsx
<Footer>
  <Footer.Container>...</Footer.Container>
  <Footer.Section>...</Footer.Section>
</Footer>
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
