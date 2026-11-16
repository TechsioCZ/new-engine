<!-- Source: written from libs/ui code and the usage skill (no UX_docs counterpart). Storybook: Templates/SearchSuggestions → UX guidelines. -->

# SearchSuggestions: UX guidelines

SearchSuggestions is header or catalog search that suggests products,
categories, brands and articles while the user types, and takes them there.
Every suggestion is a link; nothing is "selected" into a form.

## When to use

- Storefront search that navigates to results as the user types.

## Use something else when

| Need | Use instead |
| --- | --- |
| Choosing a value for a form field | `Combobox` |
| App commands (⌘K) | `Command` |
| A plain search box that submits to a results page | `SearchForm` |

## Anatomy

- **Input** with its label (`label`), built on Combobox.
- **Groups** (`groups`): optional group heading, then result links; each item
  has `value`, `label` and `href`.
- **Result slot** (`resultSlot`): rich row content such as image, name and
  price. The whole row is the link.
- **All results link** (`allResultsLink`): the footer link to the full results
  page.
- **Status**: loading, no results, or error with retry.

## Variants and states

There is no Figma component; these are the code options.

| Code | Meaning |
| --- | --- |
| `size="sm" \| "md" \| "lg"` (default `md`) | Input density. |
| `loading` + `loadingMessage` | Results for the current query are on the way. |
| empty `groups` + empty query | Idle: nothing to show yet. |
| empty `groups` + a query | `noResultsMessage`. |
| `error` + `onRetry` + `retryLabel` | The request failed; offer to try again. |
| `readOnly` | The saved query stays focusable and copyable; no editing, clearing, opening or navigation. |
| `disabled` | Unavailable; wins over `readOnly`. |
| `helpText`, `validateStatus` | Help and validation text under the input. |

## Behaviour

**May:** suggest as the user types; navigate when the user picks a result
(Enter on a highlighted item or a click).

**Must not:** navigate on highlight or arrow keys alone; auto-pick the first
result; select a value into a form.

- Enter on the typed query with nothing highlighted goes to the full results
  page. The app wires this; the template doesn't submit by itself.
- Modified clicks (new tab, new window) keep normal browser behaviour.
- New results replace the groups without touching what the user typed; a slow
  response never overwrites a newer query. Fetching and debounce are the app's.
- Before typing, the app may show recent or popular searches as groups.
- Inside a modal Dialog keep the popup inline (the default); don't portal it.

## Content and copy

- Group headings are plural nouns: `Products`, `Categories` — cs: `Produkty`,
  `Kategorie`.
- At most about 8 suggestions per group.
- The footer names the query and the count: `See all 124 results for “linen”`
  — cs: `Zobrazit všech 124 výsledků pro „len“`.
- No results names the query and suggests what to try — cs:
  `Pro „lenn“ jsme nic nenašli. Zkontrolujte překlep.`
- Prices formatted by the app's locale.

## Accessibility

- The kit provides combobox semantics, grouped options, highlighted-item
  announcements and the inline status messages.
- Don't put buttons or links inside `resultSlot`; the row is already the link.
- Item `value`s are unique across all groups so each option has its own
  identity.

## Edge cases

- **Request fails**: show the error with `Try again`; keep the query.
- **Results arrive for an older query**: discard them in the app; the visible
  list always matches the input.
- **Narrow screens**: rich rows stay usable; keep the result slot short so
  name and price both stay readable.

## Related

- [Combobox](../../combobox-usage/references/ux.md): the control it is built on.
- [SearchForm](../../search-form-usage/references/ux.md): submit-only search.
- [States](../../ux-guidelines/references/states.md): no-results and error.
