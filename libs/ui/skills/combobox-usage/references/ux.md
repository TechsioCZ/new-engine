<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/combobox--2774-36312.md (+ combobox-content, token-icon combobox-clear and combobox-chevron), edited. Storybook: Molecules/Combobox → UX guidelines. -->

# Combobox: UX guidelines

A Combobox combines a text query with a list of options: the user types to
find an existing value, then chooses it. The typed query and the chosen value
are different things.

## When to use

- One or more values from a long list where typing is the fastest way to find
  them: countries, customers, products, tags.
- Options loaded from the server as the user types.

## Use something else when

| Need | Use instead |
| --- | --- |
| A short known list (under ~10) | `Select`, or `RadioGroup` for 2–5 visible options |
| Search that navigates to pages or products | `SearchForm` / `SearchSuggestions` |
| Running app commands | `Command` |
| Hierarchical values | `CascadeSelect` |

## Anatomy

- **Label** (`label`) and **input** for the query, with an optional
  `placeholder` that is an instruction, never the label.
- **Trigger (chevron)** opens the list; **clear** (`clearable`) clears the
  value or query.
- **List** of options from `items` or `groups`, or one status: loading,
  error with retry, or no matches. Figma calls it "Content"; in code it is
  driven by props, not a part.
- **Selected tokens** (with `multiple`): each has a named Remove button.
- **Help text**: `helpText`, the error message when `validateStatus="error"`.

Three things never look the same: the draft query, the highlighted option and
the confirmed value.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` | Match the surrounding controls. |
| `state=default` | `validateStatus="default"` | No known problem; not proof of validation or saving. |
| `state=error` | `validateStatus="error"` | A specific, fixable problem; the draft stays to fix. |
| `state=success` | `validateStatus="success"` | This value was actually checked. |
| `state=warning` | `validateStatus="warning"` | Needs attention; the user may continue. |
| `state=disabled` | `disabled` | Not usable now, for a reason the user can find. |
| — | `readOnly` | Value readable and focusable, submitted; the list never opens and clear is hidden. Not in Figma. |
| `required=true` / `false` | `required` | Required is checked against the chosen value, not the typed text. |
| — | `multiple` | Several values as tokens. Not in Figma. |
| Content `state=options` | items shown | Matching options; showing them commits nothing. |
| Content `state=empty` | `noResultsMessage` | The search worked and nothing matched. |
| — | `loading`, `error` + `onRetry` | Waiting, and a failed load. Never shown as "no matches". |

## Behaviour

**May:** type a query, browse matching options and confirm one; clear the
selection when the field allows it.

**Must not:** treat the typed query as a chosen value; run an unrelated
command as an option.

- Opening the list and moving through options don't change the value.
  Choosing an option commits its identity; closing without choosing keeps the
  previous value ([Value lifecycle](../../ux-guidelines/references/value-lifecycle.md)).
- Clear (×) removes the value or query only. It never deletes the record that
  value represents, and on a required field it leaves a missing value that
  validation reports.
- Free text becomes a value only with `allowCustomValue`; otherwise restrict
  or validate.
- With remote options (`filterBehavior="external"`), debounce, show loading in
  the list, and tell no matches apart from a failed load. An older response
  must never replace the results of a newer query.
- Don't open a list of hundreds before the user types; show recent or popular
  items instead.

## Content and copy

- Label is the noun (`Customer` — cs: `Zákazník`); placeholder an instruction:
  `Search customers…` — cs: `Hledat zákazníky…`.
- No matches names the query: `No customers match “nor”` — cs:
  `Žádný zákazník neodpovídá „nor“`. Offer `Create “Nora”` only with
  `allowCustomValue`.
- A load error says it failed and offers `Try again` (`retryLabel`).
- Two options with the same name need a distinguishing detail in `item.label`
  (city, team, ID); `renderItem` alone isn't announced.

## Accessibility

- The kit handles the combobox and listbox roles, arrow keys, Enter to choose,
  Escape to close, and named Remove buttons in multiple mode.
- Choosing works fully without a mouse.
- The accessible name of an option is always `item.label`. Don't put links or
  buttons inside `renderItem`.
- Highlighted, selected and focused are distinguishable without colour.

## Edge cases

- **Two customers named Jan Novák**: the labels include a distinguishing
  detail; highlighting one never assigns it.
- **Slow search**: results for `drill` arrive after `drill bits`; the older
  response is dropped.
- **Service down**: the list shows an error with `Try again`, not
  `No customers match`.

## Related

- [Value lifecycle](../../ux-guidelines/references/value-lifecycle.md): draft query vs chosen value, clearing is not deleting, newer intent wins.
- [Component selection](../../ux-guidelines/references/component-selection.md): Combobox vs Select vs SearchForm.
- [Select](../../select-usage/references/ux.md): short known lists.
