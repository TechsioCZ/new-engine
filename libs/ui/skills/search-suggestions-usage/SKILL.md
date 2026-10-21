---
name: search-suggestions-usage
description: Use for grouped storefront search navigation with rich results and an all-results link, composed from the UI-kit Combobox.
metadata:
  component_version: "1.0.1"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
requires:
  - component-usage-ux
  - combobox-usage
  - ux-guidelines
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

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `SearchSuggestions`.

**Use it when**

- Header/catalog search that suggests products, categories, brands and articles as the user types and navigates to them.

**Use something else when**

| Need | Use instead |
| --- | --- |
| Selecting a value in a form | Combobox |
| App commands | Command |

**Do**

- Group suggestions by type with headings; show product image and price in product rows.
- Keep Enter on the typed query going to the full results page.
- Show recent/popular searches on focus before typing.

**Don't**

- Auto-navigate on highlight.
- Show more than ~8 suggestions per group.

**Copy and states**

- `See all 124 results for “linen”` as the last item.

## Contract

Shared props are derived from ComboboxProps. Supply `groups`, each with a unique
`id`, optional `label`, and items with globally unique `value`, `label` and `href`.
Optional `data` carries normalized presentation data for `resultSlot(item)`.
`resultSlot` maps to Combobox `renderItem`; `allResultsLink` maps to `footer`.
Do not put interactive children inside the result slot. The option is the anchor.

Defaults: external filtering, query-preserving navigation, no input autocomplete,
inline popup. Fixed positioning keeps the inline popup clear of a scrollable
Dialog while preserving its focus containment and natural Tab order for the
footer/retry. Do not portal the popup to `document.body` inside a modal Dialog:
the dialog can hide it from assistive technology. Outside a modal, `portalled`
remains available when needed.

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

## Shared field contracts

The inherited readOnly prop keeps the saved query focusable and copyable but
blocks editing, clear, result navigation and popup opening (including supplied
open/defaultOpen). Disabled takes precedence. Use helpText and validateStatus
for linked inline StatusText validation with state icons. Canonical sizes are
sm/md/lg, default md; popup layers and reduced-motion behavior follow Combobox.
The Storybook demos intercept navigation; consumers still supply their router
through navigate or use native anchor navigation. Figma-sync handoff should
include the immutable-query and validation states.

## Focusable input integration

`ref` targets the actual `HTMLInputElement`, including React 19 callback-ref
cleanup; `inputProps` forwards native input attributes and composed focus/blur
handlers without replacing machine value/editability. Input descriptions merge
with linked helper text. `className`, `style` and ordinary div DOM props target
the root. These are the same APIs as Combobox, preserved through this template.
The Playground simulates application-owned external filtering; production apps
still own request debounce, fetching and replacement of result groups.

## Silent native form reset

Native reset calls no value-change callbacks and dispatches no native `input`
or `change` events, in controlled or uncontrolled usage. Uncontrolled controls
silently restore their default; controlled controls
keep the latest parent value and re-sync visible/accessibility/native submission
state to it. Handle the form's `onReset` to intentionally change parent state.
Canceled resets leave every channel unchanged. Reset does not synthesize events
or move focus; the first real user edit afterward emits exactly one normal
callback, including when the same value was entered before reset.

Navigation mode has no submitted selection. Its query follows the same silent
reset rule: restore the latest `defaultInputValue` when uncontrolled, or keep
`inputValue` when controlled.
