---
name: search-form-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit SearchForm for
  search landmarks, controlled or uncontrolled search text, label, control,
  input, submit button, clear button, icon props, and token-backed field
  layout.
metadata:
  component_version: "1.1.1"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-usage-ux app-token-overrides ux-guidelines"
  sources: ""
  contributor_sources: "libs/ui/src/molecules/search-form.tsx libs/ui/src/tokens/components/molecules/_search-form.css libs/ui/stories/molecules/search-form.stories.tsx libs/ui/src/molecules/search-form.figma.ts"
  resources: "../../references/component-contracts.md ../../references/consumer_app_usage_rules.md"
  audience: "consumer"
---

> Portable scope: Use the installed package's exported types and bundled sibling skills. Repository source paths are optional contributor evidence, not consumer prerequisites; use the consuming app's own checks. Resolve ../../references/ paths from this skill's folder, not the app working directory.

# @techsio/ui-kit SearchForm Usage

Use SearchForm for search input and submit/clear actions. It wraps a semantic
`<search>` and `<form>`.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `SearchForm`.

**Use it when**

- Site or catalog search input with submit and clear.

**Use something else when**

| Need | Use instead |
| --- | --- |
| Search with live suggestions that navigate | SearchSuggestions |
| Filtering a table | DataTable global filter |
| Picking a form value | Combobox |

**Do**

- Keep the query visible on the results page and in the URL.
- Offer clear (`Clear search`) and submit on Enter.
- Results page states the query and count (`24 results for “linen”`) and a helpful no-results state.

**Don't**

- Search on every keystroke against the full catalog without debounce.
- Hide the search field behind an icon on desktop storefronts.

**Copy and states**

- Placeholder `Search products…`; button label `Search`.

## Setup

```tsx
<SearchForm onSubmit={handleSubmit} value={query} onValueChange={setQuery}>
  <SearchForm.Label>Search products</SearchForm.Label>
  <SearchForm.Control>
    <SearchForm.Input />
    <SearchForm.ClearButton />
    <SearchForm.Button showSearchIcon>Search</SearchForm.Button>
  </SearchForm.Control>
</SearchForm>
```

Supported props:

```text
size: sm | md | lg
value/defaultValue, onValueChange, onSubmit
Label, Control, Input, Button, ClearButton
Button showSearchIcon, icon, iconPosition
```

## Core Patterns

### Use for actual search workflows

Use Input/FormInput for non-search text entry.

### Keep clear behavior in ClearButton

`SearchForm.ClearButton` only renders when the field has a value.

### Use Button part for submit

Do not place a native submit button inside the control.

## Common Mistakes

### HIGH Manual search form

Wrong:

```tsx
<form><input type="search" /><button>Search</button></form>
```

Correct:

```tsx
<SearchForm><SearchForm.Control><SearchForm.Input /><SearchForm.Button /></SearchForm.Control></SearchForm>
```

Source: libs/ui/src/molecules/search-form.tsx

### HIGH Native clear button

Wrong:

```tsx
{query && <button onClick={() => setQuery("")}>x</button>}
```

Correct:

```tsx
<SearchForm.ClearButton />
```

Source: libs/ui/src/molecules/search-form.tsx

### HIGH Inline field styling

Wrong:

```tsx
<SearchForm.Control className="rounded border px-2" />
```

Correct:

```tsx
<SearchForm size="md"><SearchForm.Control /></SearchForm>
```

Source: libs/ui/src/tokens/components/molecules/_search-form.css

## Validation Commands

```sh
rg -n "<input[^>]*type=\"search\"|<SearchForm\\.(Control|Input)[^>]*className=.*(border-|rounded-|px-|py-|bg-)" apps
rg -U -P -n "<SearchForm(?![\\s\\S]{0,500}<SearchForm\\.Input)" apps
rg -n "<SearchForm\\.Button[^>]*type=" apps
```

## Field contracts

Root `readOnly` and `disabled` propagate through the compound input and actions.
Read-only text remains focusable, selectable and submittable; editing and clear
are blocked. Disabled removes the input and actions from the tab order.
`SearchForm.Input` may also set native `readOnly`/`disabled`; these states gate
the compound clear handler as well.

`SearchForm.Label` supplies the accessible input name. The generic `Search`
aria-label is a fallback only when no visible label is composed; explicit
consumer `aria-label` and `aria-labelledby` remain available. Clearing restores
input focus. Without `SearchForm.Button`, both input corners remain rounded.

Set root `validateStatus` and compose `SearchForm.StatusText` for inline help or
validation. Messages use unique stable IDs, merge caller descriptions and
register error-message associations; error/warning/success include state icons.
Canonical sizes are sm/md/lg (default md). Public state/API changes require
a Figma-sync handoff after stabilization.

The inline clear action reserves one control-height of trailing input space,
matching its icon target and inset at each size instead of a generic button-width
reservation. This keeps the editable query area usable in narrow layouts.
