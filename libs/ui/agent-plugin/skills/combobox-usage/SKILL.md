---
name: combobox-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Combobox for
  searchable selection with Zag.js collection behavior, controlled value/input,
  multiple mode, validation status, clear trigger, and token styling.
metadata:
  component_version: "1.6.1"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-usage-ux app-token-overrides ux-guidelines"
  sources: "https://zagjs.com/components/react/combobox"
  contributor_sources: "libs/ui/src/molecules/combobox.tsx libs/ui/src/tokens/components/molecules/_combobox.css libs/ui/stories/molecules/combobox.stories.tsx libs/ui/src/molecules/combobox.figma.ts"
  resources: "../../references/component-contracts.md ../../references/consumer_app_usage_rules.md"
  audience: "consumer"
---

> Portable scope: Use the installed package's exported types and bundled sibling skills. Repository source paths are optional contributor evidence, not consumer prerequisites; use the consuming app's own checks. Resolve ../../references/ paths from this skill's folder, not the app working directory.

# @techsio/ui-kit Combobox Usage

Use Combobox for searchable select-like input. Use Select when search/filtering
is not needed.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `Combobox`.

**Use it when**

- Choosing one or more values from a long list where typing is the fastest way to find it (countries, customers, products, tags).
- Lists loaded asynchronously as the user types.

**Use something else when**

| Need | Use instead |
| --- | --- |
| Fewer than ~10 known options | Select (or RadioGroup for 2–5 visible options) |
| Search that navigates to pages/products | SearchSuggestions / SearchForm |
| Running app commands | Command |
| Hierarchical values | CascadeSelect |

**Do**

- Show a helpful empty state (`No customers match “nor”`) and, when allowed, a create option (`Create “Nora”`).
- Debounce remote search and show loading inside the listbox, not a page spinner.
- Keep selected values visible (tags for multiple) and removable by keyboard.
- Highlight the matched part of each option.

**Don't**

- Allow free text when the value must come from the list — validate or restrict.
- Open the list with hundreds of items before the user types; show recent or popular items instead.

**Copy and states**

- Placeholder is an example or instruction (`Search customers…`), never the label.

## Setup

```tsx
import { Combobox } from "@techsio/ui-kit/molecules/combobox"

<Combobox
  label="Country"
  name="country"
  items={[{ label: "Czechia", value: "CZ" }]}
  onChange={setCountry}
/>
```

Supported props:

```text
items: { id, label, value, disabled, data, href }[]
groups: { id, label?, items }[] (alternative to items; never pass both)
value/defaultValue: string | string[]
inputValue, multiple, clearable, closeOnSelect, allowCustomValue
validateStatus: default | error | success | warning
inputBehavior: autohighlight | autocomplete | none
onChange, onInputValueChange, onOpenChange
filterBehavior: local | external
loading, loadingMessage, error, onRetry, retryLabel, noResultsMessage
renderItem, footer, portalled (default true)
mode: selection | navigation (default selection)
navigate: Zag navigation callback for Enter and unmodified clicks
```

`onChange` receives Zag's selected value array, including in single selection.
Scalar `value` and `defaultValue` are normalized to arrays internally.

Use `SearchSuggestions` from `@techsio/ui-kit/templates/search-suggestions` for
grouped catalog navigation. It derives this API and chooses navigation defaults.

### Groups and Navigation

Group IDs and item values must be unique within the control. Unlabelled groups
are allowed; empty groups are omitted. Local filtering searches item labels;
external filtering displays exactly the supplied items.

`mode="navigation"` renders the option itself as an anchor using its `href`.
It preserves the query and does not expose selection or call `onChange`.
Disabled/read-only items omit href. `navigate` handles Enter and normal clicks;
modified clicks retain browser behavior. With no callback, navigation is native.
Keep routers in the consumer. Do not put links/buttons inside `renderItem`:
it customizes presentation within the existing option. The accessible name is
always `item.label`; include important identifying details in that label.

`footer` and retry controls sit outside the listbox. Use `portalled={false}` when
they need to follow the input in natural Tab order or the control is in a Dialog.
The default portal remains available for clipping-sensitive selection menus.
Status priority is loading, error, results, then empty (when a query is present).
Loading/error remove stale results from the keyboard collection.

## Core Patterns

### Use Combobox for search

Choose Combobox when the user needs to type and filter options. For short
static enum choices use Select, RadioGroup, or RadioCard.

### Keep items as collection data

Do not render a custom `<ul>` next to Input. The wrapper builds a Zag
collection from `items` and handles disabled options.

For external filtering, keep the last `items` while `loading` or `error` is
shown if the selected value still needs its label. The status replaces the
option list, and keyboard navigation is unavailable until results return.

### Filtering and opening

Local filtering is case-insensitive and matches labels, including disabled
options. The first typed character filters immediately, whether the popup was
closed or was opened by its trigger or arrow keys. Clearing the query restores
all options; explicitly reopening the popup also restores choices after selection.
External filtering bypasses this behavior and displays the supplied items.

### Rich option foregrounds

Let the main label, decorative icons, and selection indicator inherit the row's
color. Use `text-combobox-item-fg-secondary` for secondary text in `renderItem`.
This token becomes the paired foreground on highlighted and checked surfaces;
`text-fg-secondary` or a fixed icon color will not adapt to a selected row.
Keep custom content non-interactive and identify the option with `item.label`.

```tsx
renderItem={(item) => (
  <div className="flex min-w-0 flex-col">
    <span>{item.label}</span>
    <span className="text-combobox-item-fg-secondary text-sm">
      {item.data?.subtitle}
    </span>
  </div>
)}
```

### Use validation props, not border classes

`validateStatus` controls trigger/input border state and `helpText` renders
StatusText.

## Common Mistakes

### HIGH Native datalist/custom dropdown

Wrong:

```tsx
<Input list="countries" /><datalist id="countries" />
```

Correct:

```tsx
<Combobox items={countries} label="Country" />
```

Source: libs/ui/src/molecules/combobox.tsx

### HIGH Wrong value shape for multiple

Wrong:

```tsx
<Combobox multiple value="CZ" />
```

Correct:

```tsx
<Combobox multiple value={["CZ"]} />
```

Source: https://zagjs.com/components/react/combobox

### HIGH Inline dropdown styling

Wrong:

```tsx
<Combobox className="border-red-500 bg-white" validateStatus="error" />
```

Correct:

```tsx
<Combobox validateStatus="error" helpText="Required" />
```

Source: libs/ui/src/tokens/components/molecules/_combobox.css

## Validation Commands

```sh
rg -n "<datalist|role=\"listbox\"|<Combobox[^>]*multiple[^>]*value=\"" apps
rg -n "<Combobox[^>]*className=.*(bg-|text-|border-|p-|px-|py-)" apps
rg -n "<Combobox[^>]*validateStatus=\"(danger|invalid)\"" apps
```

## Submission and immutable fields

Selection mode submits item values, never the visible input label. With
`multiple`, each selected value uses a separate entry under `name`, so read
`new FormData(form).getAll(name)`. An empty selection submits an empty entry;
disabled fields submit nothing. Navigation mode does not submit selection data.
The visible text input intentionally has no name in selection mode.
For a field outside its form, pass `inputProps={{ form: "order-form" }}`. That
association applies to both the visible input and every named hidden selection,
including empty, multiple and read-only values; disabled selections stay omitted.

Read-only inputs preserve focus and text selection, suppress all opening even
with open/defaultOpen, and omit clear/dropdown actions. Error help is linked
with aria-errormessage. Keyboard focus on the input activates the control ring.
Popup transitions respect reduced motion. Visual/state updates need a Figma-sync
handoff after stabilization.

Caller aria-label, aria-labelledby and aria-describedby are forwarded to the
input; caller descriptions merge with linked help and the multiple-selection
summary. Multiple selections expose every selected label below the control so
read-only multi-value fields remain inspectable even when the query is empty.

When selection mode becomes read-only, any uncommitted query is discarded and
the selected labels are restored, including when the query is controlled.
For a controlled query, `onInputValueChange` also reports the restored label(s)
so unlocking cannot resurrect the discarded draft. Navigation mode retains its
search query instead. `required` in selection mode
uses the selected value(s) for native form validity: arbitrary search text is not
a selection, and an empty query does not invalidate a nonempty multiple selection.
Native validation focuses the visible input. Navigation mode validates the query.
Labels follow the canonical control size rather than a fixed medium size.

## Input integration and selected values

`ref` targets the focusable `HTMLInputElement` (including React 19 callback-ref
cleanup). `inputProps` accepts native attributes and composed focus/blur/key events;
value, disabled, readOnly, required, name and the machine input ID stay owned by the
component. Caller descriptions merge with linked helper/selection descriptions.
`className`, `style` and other div DOM attributes target the root. SearchSuggestions
preserves the same API. `onChange` always emits `string[]`, even in single mode;
scalar `value`/`defaultValue` inputs remain a convenience. A `string[]` React state
setter can be passed directly.

Multiple mode renders built-in selected tokens independently of the query. Each
has a named Remove button that returns focus to the input; Backspace on the empty,
closed input removes the last selection. Read-only values remain visible without
remove buttons; disabled buttons are not focusable. Do not add duplicate story/app
chips around this built-in presentation. Labels resolve from the full collection
or machine selection cache, not the filtered results.

## Silent native form reset

Native reset calls no value-change callbacks and dispatches no native `input`
or `change` events, in controlled or uncontrolled usage. Uncontrolled controls
silently restore their default; controlled controls
keep the latest parent value and re-sync visible/accessibility/native submission
state to it. Handle the form's `onReset` to intentionally change parent state.
Canceled resets leave every channel unchanged. Reset does not synthesize events
or move focus; the first real user edit afterward emits exactly one normal
callback, including when the same value was entered before reset.

The default query is the latest `defaultInputValue` when provided. With a
controlled selection and replacement query, accepted/refused selections and
external parent updates resolve text and selected-option ARIA from the
authoritative value, not the proposed item or filtered results. Replacing an
item's label without changing its key refreshes selected text too, including
after reset; this is not a user edit and emits no value/query callback. An
active search draft is preserved during collection updates. Without an explicit
`defaultInputValue`, reset resolves the default selection's latest labels rather
than its mount-time labels. An explicitly controlled `inputValue` remains
independently parent-owned.
