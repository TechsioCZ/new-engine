---
component_version: "1.0.0"
name: search-suggestions-usage
description: Use for grouped storefront search navigation with rich results and an all-results link, composed from the UI-kit Combobox.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - combobox-usage
sources:
  - "libs/ui/src/templates/search-suggestions.tsx"
  - "libs/ui/src/molecules/combobox.tsx"
  - "libs/ui/stories/templates/search-suggestions.stories.tsx"
---

# SearchSuggestions Usage

Use this template for catalog/header search that navigates to products,
categories, brands or articles. For form value selection, use Combobox.

```tsx
import { Link } from "@techsio/ui-kit/atoms/link"
import { SearchSuggestions } from "@techsio/ui-kit/templates/search-suggestions"

<SearchSuggestions
  label="Search catalog"
  groups={[
    { id: "products", label: "Products", items: [
      { value: "product-1", label: "Mounting kit M8", href: "/products/m8" },
    ] },
  ]}
  allResultsLink={<Link href="/search?q=mounting">View all results</Link>}
/>
```

## Contract

Shared props are derived from ComboboxProps. Supply `groups`, each with a unique
`id`, optional `label`, and items with globally unique `value`, `label` and `href`.
Optional `data` carries normalized presentation data for `resultSlot(item)`.
`resultSlot` maps to Combobox `renderItem`; `allResultsLink` maps to `footer`.
Do not put interactive children inside the result slot. The option is the anchor.

Defaults: external filtering, query-preserving navigation, no input autocomplete,
inline popup. Inline placement keeps the footer/retry in natural Tab order and
inside Dialog focus containment. `portalled` is available for clipping scenarios;
the consumer must verify focus order when enabling it with interactive footer content.

Use `inputValue`/`onInputValueChange` for a controlled query and pass new groups
when results arrive. `loading`, `error`, `onRetry`, `loadingMessage`, `retryLabel`
and `noResultsMessage` are inherited. Empty groups plus an empty query mean idle;
empty groups plus a nonempty query show the no-results message.

`navigate` accepts Zag's `{ href, node, value }` details; href is resolved by the
browser. It is invoked once for Enter or an unmodified result click. The callback
owns navigation when supplied. Without it, real anchors navigate natively.
Modified clicks retain browser navigation. Format prices and build hrefs in the
app; fetching, debounce, routing, analytics and DTO adaptation stay outside UI.

## Figma Handoff

| Code surface | Figma representation |
| --- | --- |
| size | Variant |
| open, loading, error, empty, results | State examples/variants |
| group label, input label, placeholder, status messages | Text |
| resultSlot | Instance swap/content slot |
| allResultsLink | Footer slot |
| groups data, href, navigate and other callbacks | Code only |

The template reuses Combobox anatomy and tokens. Code owns API and token names;
Figma owns static values. Run component-to-figma only after API/stories stabilize.
