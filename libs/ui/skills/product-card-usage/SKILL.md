---
name: product-card-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit ProductCard
  for product summaries with image adapter, name, price, stock, badges,
  rating, actions, and card button variants.
metadata:
  component_version: "1.3.1"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
requires:
  - component-usage-ux
  - framework-consumer-integration
  - app-token-overrides
  - ux-guidelines
sources:
  - "libs/ui/src/molecules/product-card.tsx"
  - "libs/ui/src/tokens/components/molecules/_product-card.css"
  - "libs/ui/stories/molecules/product-card.stories.tsx"
  - "libs/ui/src/molecules/product-card.figma.ts"
---

# @techsio/ui-kit ProductCard Usage

Use ProductCard for product listing and recommendation surfaces. It is a
compound component; do not rebuild product card structure with generic divs.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `ProductCard`.

**Use it when**

- Products in listings, search results, recommendations and carousels.

**Use something else when**

| Need | Use instead |
| --- | --- |
| Product detail page | the detail layout with Gallery |
| Admin product rows | DataTable |

**Do**

- Show, in this order: image, name, key variant info, price (formatted, with the previous price when discounted), availability, one action.
- Make the name the link to the product; keep one primary action (`Add to cart`).
- Confirm `Add to cart` with a toast (`Added to cart`) and update the cart count.
- Keep card heights consistent in a grid; clamp long names to two lines with the full name available.

**Don't**

- Stack more than two badges.
- Hide the price until hover.

**Copy and states**

- Price via `Intl.NumberFormat` currency; discounts as `−20 %` badge plus struck-through old price.

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

`ProductCard.Name` is an `h3` by default; set `as` (or `nameAs` on
`ProductCardTemplate`) so it follows the page outline, e.g. `as="h2"` for cards
directly under the page `h1`.

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
<ProductCard><ProductCard.Image src={product.image} alt={name} /><ProductCard.Name>{name}</ProductCard.Name></ProductCard>
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

## Shared contracts

Aggregate ratings in ProductCardTemplate and ProductCard.Rating with `rating.readOnly=true` are static accessible summaries, not editable controls or tab stops. An explicitly interactive ProductCard.Rating keeps the underlying Rating API; supply a meaningful label/name and use the standalone Rating story for form-capture guidance. Card images use a consistent 4:3 aspect ratio in column layouts. Detail and wishlist actions keep their own hover/pressed colors rather than inheriting primary Button pressed styling.

ProductCard is a content layout, not a single interactive field: it has no root sm/md/lg axis. Its actions use Button's canonical sm height and explicit action-specific foreground/background tokens. Images reserve a consistent aspect ratio; names reserve two text lines for row-to-row comparison. Public media/layout changes need a Figma-sync follow-up.

Keep custom row/grid demos responsive with standard grid utilities and constrain their parent width. Every demo action must update local state or give explicit local-only feedback; wishlist buttons expose their toggle through aria-pressed.

## Template and adapter contracts

ProductCard.Image preserves required `src`, `alt` and selected adapter props; select an adapter with `as`. Use `alt=""` only for deliberately decorative images. ProductCard.Button inherits Button loadingText/isLoading, native click events, disabled, type, ARIA and ref props; its size and visual variant are owned by the card.

ProductCardTemplate accepts ReactNode names, `href`, `linkAs` and `linkProps` using the kit Link adapter pattern. A destination makes the name a link inside its heading, not a wrapper around cart/wishlist buttons. Without a destination it stays a nonlinked heading. Preserve normal modified-click behavior in applications; intercept navigation only in demos. Pass localized `originalPriceLabel` and `currentPriceLabel` (English defaults) for sale-price meaning. Previous amounts use deletion markup plus an actual visually hidden label. Badge objects are forwarded in full, including attributes, size, styles and passive handlers; give changing or duplicate-label badges stable `key` values.
