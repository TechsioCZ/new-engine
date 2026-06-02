---
name: search-form-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit SearchForm for
  search landmarks, controlled or uncontrolled search text, label, control,
  input, submit button, clear button, icon props, and token-backed field
  layout.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - app-token-overrides
sources:
  - "libs/ui/src/molecules/search-form.tsx"
  - "libs/ui/src/tokens/components/molecules/_search-form.css"
  - "libs/ui/stories/molecules/search-form.stories.tsx"
  - "libs/ui/src/molecules/figma/search-form.figma.tsx"
---

# @techsio/ui-kit SearchForm Usage

Use SearchForm for search input and submit/clear actions. It wraps a semantic
`<search>` and `<form>`.

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
