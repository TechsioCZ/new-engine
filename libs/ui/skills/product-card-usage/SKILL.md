---
name: product-card-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit ProductCard
  for product summaries with image adapter, name, price, stock, badges,
  rating, actions, and card button variants.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - framework-consumer-integration
  - app-token-overrides
sources:
  - "libs/ui/src/molecules/product-card.tsx"
  - "libs/ui/src/tokens/components/molecules/_product-card.css"
  - "libs/ui/stories/molecules/product-card.stories.tsx"
  - "libs/ui/src/molecules/figma/product-card.figma.tsx"
---

# @techsio/ui-kit ProductCard Usage

Use ProductCard for product listing and recommendation surfaces. It is a
compound component; do not rebuild product card structure with generic divs.

## Setup

```tsx
<ProductCard layout="column">
  <ProductCard.Image as={NextImage} src={product.image} alt={product.title} />
  <ProductCard.Name>{product.title}</ProductCard.Name>
  <ProductCard.Price>{price}</ProductCard.Price>
  <ProductCard.Stock status="in-stock">In stock</ProductCard.Stock>
  <ProductCard.Actions><ProductCard.Button buttonVariant="cart">Add</ProductCard.Button></ProductCard.Actions>
</ProductCard>
```

Supported parts:

```text
Root layout: column | row
Image as adapter
Stock status: in-stock | limited-stock | out-of-stock
Button buttonVariant: cart | detail | wishlist | custom
Badges, Rating, Actions, Name, Price
```

## Core Patterns

### Use slots for meaning

Name, Price, Stock, Rating, Badges, Actions and Button each map to component
tokens. Do not replace them with local headings and paragraphs.

### Use NextImage adapter in Next apps

Pass `as={NextImage}` to `ProductCard.Image`.

### Choose buttonVariant by action

Use `cart` for add-to-cart, `detail` for details, `wishlist` for wishlist
actions, and `custom` only when tokens/API cannot express the action.

## Common Mistakes

### HIGH Custom product card

Wrong:

```tsx
<div className="rounded border p-4"><img /><h3>{name}</h3></div>
```

Correct:

```tsx
<ProductCard><ProductCard.Image /><ProductCard.Name>{name}</ProductCard.Name></ProductCard>
```

Source: libs/ui/src/molecules/product-card.tsx

### HIGH Wrong stock status

Wrong:

```tsx
<ProductCard.Stock status="available">Available</ProductCard.Stock>
```

Correct:

```tsx
<ProductCard.Stock status="in-stock">Available</ProductCard.Stock>
```

Source: libs/ui/src/molecules/product-card.tsx

### HIGH Inline card styling

Wrong:

```tsx
<ProductCard className="rounded-xl border p-6 shadow" />
```

Correct:

```tsx
<ProductCard layout="column" />
```

Source: libs/ui/src/tokens/components/molecules/_product-card.css

## Validation Commands

```sh
rg -U -n "<img\\b[\\s\\S]{0,500}<h3|<ProductCard[^>]*className=.*(rounded-|border-|p-|shadow-)" apps
rg -n "status=\"(available|sold-out|low-stock)\"|buttonVariant=\"(primary|danger)\"" apps
rg -P -n "<ProductCard\\.Image(?![^>]*as=\\{?NextImage)" apps
```
