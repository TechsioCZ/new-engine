<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/searchform--2774-32835.md (+ part docs searchform-label, -control, -input, -button-label, -button-icon, -clearbutton and glyph docs token-icon-search, -close), edited. Storybook: Molecules/SearchForm → UX guidelines. -->

# SearchForm: UX guidelines

SearchForm sends a query to a named scope of results on purpose. Typing,
submitting and opening a result are three different steps.

## When to use

- Site or catalogue search with a submit button and optional clear.
- Searching a named scope: products, orders, manuals.

## Use something else when

| Need | Use instead |
| --- | --- |
| Live suggestions that navigate as you type | `SearchSuggestions` |
| Picking one value for a form field | `Combobox` |
| Running app commands (⌘K) | `Command` |
| Filtering a table in place | DataTable global filter |

## Anatomy

`SearchForm` (a `<search>` landmark wrapping a `<form>`) with
`SearchForm.Label`, `SearchForm.Control` holding `SearchForm.Input`, optional
`SearchForm.ClearButton` (inside the input, shown only with a value) and
`SearchForm.Button` (text, icon or both). `SearchForm.StatusText` adds help or
validation.

The submit button (text or `token-icon-search`) and the clear button
(`token-icon-close`) have different purposes and never look alike.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` | Match the surrounding controls; `md` is the default. |
| `gapped=false` / `true` | `gapped` | Joined or visually separated input and button; still one search. |
| `state=input-focus`, `button-focus` | not props | Browser focus. Focus never submits. |
| `state=disabled` | `disabled` | Not usable now; input and actions leave the tab order. The reason must be findable. |
| — | `readOnly` | The query is readable, focusable and submittable but can't be edited or cleared. |
| — | `validateStatus` + `SearchForm.StatusText` | Help or a validation message tied to the input. |

## Behaviour

**May:** submit the current query with the button or Enter; clear the typed
query with `SearchForm.ClearButton`.

**Must not:** treat submitting as choosing a result; auto-open the first
result; suggest or filter on every keystroke unless the product decided so.

- The input holds a draft. The last submitted query and its results stay as
  they are until a new search is submitted.
- After submit the app tells waiting, results, no matches and a failure
  apart. A failure keeps the query for a retry and never says "no results".
- With async search, an older response never replaces the results of a newer
  query.
- Clearing empties the input and returns focus to it. It doesn't by itself
  cancel or reset the results already shown, and never deletes records;
  decide and document what the results do after a clear.
- Live suggestions or filtering are a separate decision (`SearchSuggestions`),
  not part of the form.

## Content and copy

- The label names the scope: `Search products`, `Search orders` — cs:
  `Hledat produkty`, `Hledat objednávky`. A placeholder doesn't replace it.
- The button says `Search` — cs: `Hledat`. An icon-only submit needs the same
  accessible name.
- The results page repeats the query and count: `24 results for “linen”` —
  cs: `24 výsledků pro „len“`.
- No results ≠ failure: `No products match “linen”` vs `Search isn't available right now. Try again.`

## Accessibility

- `SearchForm.Label` names the input; without it the fallback name is the
  English `Search`, so pass a localized `aria-label` when there is no visible
  label.
- The clear button's default name is `Clear search: <query>` in English;
  localize it with `aria-label` (cs: `Vymazat hledání: <dotaz>`).
- Submit works by keyboard (Enter). Controls never cover the typed text.

## Edge cases

- **Typing a new query** (`O-1049`) doesn't relabel the results of the
  previous one until the new search is submitted.
- **Clearing after a search**: the input empties; the old results stay until
  the product's rule says otherwise, and the UI doesn't pretend the search
  was cancelled.
- **Service down**: an error with `Try again`, never an empty-result message.

## Related

- [Search suggestions](../../search-suggestions-usage/references/ux.md): as-you-type results.
- [Value lifecycle](../../ux-guidelines/references/value-lifecycle.md): draft vs submitted, clear vs delete.
- [States](../../ux-guidelines/references/states.md): empty vs error vs loading.
