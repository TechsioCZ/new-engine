<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/productcard--2774-36053.md (+ part docs productcardimage, -name, -price, -badges, -rating, -stock, -actions, -button and glyph docs token-icon-cart, -cart-button, -detail-button, -heart, -wishlist-button), edited. Storybook: Molecules/ProductCard → UX guidelines. -->

# ProductCard: UX guidelines

A ProductCard summarises one offer so the user can compare it and move on to a
clearly separate next step: open the detail, add to cart or save to a
wishlist. Every part of the card describes the same product variant.

## When to use

- Products in listings, search results, recommendations and carousels.
- Comparing a few offers at a glance by image, name, price and availability.

## Use something else when

| Need | Use instead |
| --- | --- |
| A product row in the cart or order recap | `LineItem` |
| The product detail page | the detail layout with `Gallery` |
| Many rows compared by exact values (admin) | `DataTable` |

## Anatomy

`ProductCard` (`layout`) with `ProductCard.Image`, `ProductCard.Name`,
`ProductCard.Price`, `ProductCard.Badges`, `ProductCard.Rating`,
`ProductCard.Stock` and `ProductCard.Actions` holding one or more
`ProductCard.Button`s. `ProductCardTemplate` assembles the same parts from
props.

- **Image**: the same variant as the name and price; crop and `alt` keep the
  product recognisable.
- **Name**: an `h3` by default (set `as` to fit the page outline). With a
  destination it holds the link to the detail.
- **Price**: one offer's price, currency and unit from the app. For
  discount, from and on-request prices compose `PriceBlock`.
- **Badges**: short properties of this offer, never the buy action.
- **Rating**: an aggregate score; the count is separate from the score.
- **Stock**: a short availability text with three states.
- **Actions**: the card's own controls, each separately focusable.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `layout=column` | `layout="column"` (default) | Vertical card for catalogue grids and narrow spaces. |
| `layout=row` | `layout="row"` | Horizontal card where name, price and action stay readable side by side; stacks in a narrow container. |
| `buttonVariant=cart` | `buttonVariant="cart"` (default) | Adds this exact offer to the cart and reports the result. |
| `buttonVariant=detail` | `buttonVariant="detail"` | Opens the detail of the same product; never changes the cart. |
| `buttonVariant=wishlist` | `buttonVariant="wishlist"` | Saves or removes interest in the product; not a purchase. As a toggle, pass `aria-pressed`. |
| — | `buttonVariant="custom"` | Only when the card's action tokens can't express the action. |
| ProductCardStock `status=in-stock` | `<ProductCard.Stock status="in-stock">` | Confirmed available. |
| `status=limited-stock` | `status="limited-stock"` | Documented limited availability; the text says what is limited. |
| `status=out-of-stock` | `status="out-of-stock"` | Not available now. Reading the detail can stay possible. |

The card has no size axis. Its buttons use Button's `sm` size; `isLoading`,
`loadingText` and `disabled` pass through to Button.

## Behaviour

**May:** open the product detail; run the named cart or wishlist action.

**Must not:** add to the cart by a click on arbitrary text or the image; let
a nested action also trigger the card's navigation; offer a fake action on a
purely informational card.

- Image, name, price, stock and actions all belong to the same variant. Never
  combine one variant's photo with another variant's price.
- The name is the link to the detail. Don't wrap the whole card, including
  its buttons, in a link; cart and wishlist stay separate tab stops.
- `ProductCard.Stock` has three states only. Don't map the six
  `AvailabilityStatus` states onto it automatically; when you need unknown,
  preorder or pending, compose `AvailabilityStatus` instead.
- Availability doesn't grant the right to buy. An out-of-stock card may keep
  the detail action but never offers a purchase that can't succeed.
- Cart: while the request runs, the button shows `isLoading`; success is
  confirmed by a toast and the cart count, failure keeps the card unchanged
  and explains why.
- Wishlist: don't show the saved state before the app confirms it.

### Glyphs

| Glyph | Means | Never means |
| --- | --- | --- |
| `token-icon-cart-button` (on `cart`) | Add this offer to the cart | Open the cart, or a finished order |
| `token-icon-cart` (header, mini-cart) | Open the cart | Add a product |
| `token-icon-detail-button` (on `detail`) | Open the detail of the same offer | Add to cart |
| `token-icon-wishlist-button` / `token-icon-heart` | Save or change interest in the product | A purchase, or a rating |

The button label and its glyph say the same thing; the token name is never
user-facing text.

## Content and copy

- Name the exact product and the variant that distinguishes it:
  `Cordless drill V18` — cs: `Aku vrtačka V18`.
- Actions are verb + object in sentence case: `Add to cart`, `View details`,
  `Add to wishlist` — cs: `Přidat do košíku`, `Zobrazit detail`,
  `Přidat do oblíbených`.
- At most two badges; discounts as a `−20 %` badge plus the struck-through
  previous price.
- Long names clamp to two lines; the full name stays available without hover,
  for example on the detail page and in the link's accessible name.

## Accessibility

- Every action works by keyboard and its name describes the result, not just
  the glyph. Icon-only card actions still need an accessible name.
- A static aggregate rating (`rating.readOnly`) is not a tab stop; expose the
  score and the scale (`4.5 of 5`).
- Meaning never depends on colour alone: stock and discount are in text.
- A long name or translation never covers the price or the main action.

## Edge cases

- **Variant photo vs price**: if the selected variant's image is missing, show
  a neutral placeholder, not another variant's photo.
- **Out of stock**: keep `View details`, hide or replace `Add to cart`.
- **Add to cart rejected** (stock changed meanwhile): explain in a toast or
  near the card and keep the card's state; the animation alone is not
  confirmation.

## Related

- [Price block](../../price-block-usage/references/ux.md) and [Availability status](../../availability-status-usage/references/ux.md): richer price and stock.
- [Line item](../../line-item-usage/references/ux.md): the same product in the cart.
- [Feedback and actions](../../ux-guidelines/references/feedback-and-actions.md): toast confirmation, one primary action.
