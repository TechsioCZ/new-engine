---
name: facet-filter-panel-usage
description: Use for controlled catalog facet presentation with generic option and range groups, active filters, overflow, and an inline panel or Dialog drawer.
metadata:
  component_version: "1.0.1"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-usage-ux accordion-usage dialog-usage form-checkbox-usage slider-usage ux-guidelines"
  sources: "libs/ui/src/templates/facet-filter-panel.tsx libs/ui/src/tokens/components/templates/_facet-filter-panel.css libs/ui/stories/templates/facet-filter-panel.stories.tsx"
---

# FacetFilterPanel Usage

Use this template for catalog facets whose data and selected state already
exist in the application. It composes Accordion, Dialog, FormCheckbox, Slider
and Button; it does not calculate facets or synchronize query parameters.

```tsx
import { FacetFilterPanel } from "@techsio/ui-kit/templates/facet-filter-panel"

<FacetFilterPanel
  title="Filters"
  groups={[
    {
      type: "options",
      id: "material",
      label: "Material",
      options: [
        { value: "linen", label: "Linen", count: 12 },
        { value: "wool", label: "Wool", count: 0 },
      ],
    },
    {
      type: "range",
      id: "price",
      label: "Price",
      min: 0,
      max: 200,
      value: price,
      formatValue: formatCurrency,
    },
  ]}
  selectedValues={{ material: ["linen"] }}
  activeFilters={[
    { id: "material:linen", label: "Linen", removeLabel: "Remove Linen" },
  ]}
  onOptionChange={({ groupId, value, checked }) =>
    updateSelection(groupId, value, checked)
  }
  onRangeChange={({ value }) => setPrice(value)}
  onRangeChangeEnd={({ value }) => commitPrice(value)}
  onRemoveFilter={removeFilter}
  onReset={clearFilters}
/>
```

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `FacetFilterPanel`.

**Use it when**

- Catalog filtering by facets (category, brand, price, colour, size) on listing pages.

**Use something else when**

| Need | Use instead |
| --- | --- |
| Filtering an admin table | DataTable column filters |
| A single sort/filter choice | Select in the listing toolbar |

**Do**

- Desktop: left rail next to results; below `lg`: the same panel in a start-side drawer (Storefront category story).
- Show counts per facet value and hide or disable zero-result values consistently.
- Show active filters as removable chips above results, with `Clear all`.
- Apply instantly on desktop; in the mobile drawer end with `[Reset] [Show 24 results]`.

**Don't**

- Reset scroll or other filters when one facet changes.
- Put price as free-text inputs only — pair a Slider with NumericInputs.

**Copy and states**

- Facet titles are nouns (`Brand`, `Price`); counts formatted with the app locale.

## Contract

Option groups contain generic `value`, `label`, optional `count`, and
explicit `disabled` items. Selection is controlled separately through
`selectedValues[groupId]`. A count of zero does not disable an option.

Range groups supply their own bounds, value, step and formatting. The template
forwards continuous changes through `onRangeChange` and committed changes
through `onRangeChangeEnd`; currency formatting and bounds normalization stay
in the application.

`activeFilters` supplies display labels and accessible removal labels.
`FacetFilterPanel.ActiveFilters` is public for matching compositions, but it
is not a filter state engine.

## Presentation

Use `presentation="inline"` for a sidebar or narrow in-page disclosure. Use
`presentation="drawer"` for a focus-managed side drawer and provide
`drawerTriggerLabel`. The application chooses the breakpoint and renders one
presentation at a time. Do not mount hidden inline and drawer copies together.

The drawer supports controlled `drawerOpen/onDrawerOpenChange` and
uncontrolled `defaultDrawerOpen`. Closing it preserves selections because all
filter values are controlled by the consumer. Focus returns to the trigger
only after the drawer actually closes, not when a controlled close is rejected.

Unless `expandedGroups` or `defaultExpandedGroups` is provided, option groups
open by default even when their data arrives after the initial render. A
controlled `expandedGroups` value remains authoritative.

`pending` and `disabled` prevent mutations without clearing current values.
`collapseAfter` enables local show-more/show-less behavior for long option
groups. Override visible labels for localization.

## Ownership Boundary

Keep fetching, URL/query state, facet/count calculation, category scope,
translations, analytics, currency rules and Apply/draft workflows outside the
template. Pass already normalized presentation data and handle emitted
callbacks in the application.

## Figma Handoff

| Code surface | Figma representation |
| --- | --- |
| inline / drawer | Layout variant |
| default, selected, empty, disabled, pending | State examples |
| option count, group label, range value, active filter | Text/content |
| option/range group | Repeated group or instance swap |
| callbacks, selectedValues, ids, formatting | Code only |

Code owns the API and token names. Figma owns static values. Run
component-to-figma only after the API and stories stabilize.
