---
name: ui-molecule-product-card
description: Use when working with the @libs/ui ProductCard molecule (src/molecules/product-card.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# ProductCard molecule
Use this skill to apply ProductCard correctly in UI work.

## Source Of Truth
- Read `src/molecules/product-card.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `ProductCard`
- `ProductCardProps`

## Purpose
Card layout with compound subcomponents for image, name, price, stock, badges, rating, actions, and buttons.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `children` | Yes | `ReactNode` | - | - |
| `layout` | No | `"column"  &#124;  "row"` | `column` | Variant prop. |
| `className` | No | `string` | - | - |
| `ref` | No | `Ref<HTMLDivElement>` | - | - |

## Compound API
- `ProductCard.Image`
- `ProductCard.Name`
- `ProductCard.Price`
- `ProductCard.Stock`
- `ProductCard.Badges`
- `ProductCard.Rating`
- `ProductCard.Actions`
- `ProductCard.Button`

## Controlled State
No explicit controlled/uncontrolled mode is documented.

## Semantics And Accessibility
Structure uses semantic elements (h3, p); no explicit ARIA beyond button usage.

## Usage Pattern
```tsx
<ProductCard>
  <ProductCard.Image>...</ProductCard.Image>
  <ProductCard.Name>...</ProductCard.Name>
</ProductCard>
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
