<!-- Source: written from libs/ui code and the usage skill (no UX_docs counterpart). Storybook: Templates/FacetFilterPanel → UX guidelines. -->

# FacetFilterPanel: UX guidelines

FacetFilterPanel shows catalog facets (option lists and ranges) with the
active filters, inline beside the results or in a drawer. The app owns the
filter state, the counts and the query; the panel only presents them and
reports changes.

## When to use

- Filtering a product listing by category, brand, price, colour, size,
  availability.

## Use something else when

| Need | Use instead |
| --- | --- |
| Filtering an admin table | `DataTable` column filters |
| One sort or filter choice | a `Select` in the listing toolbar |
| Searching the catalog by text | `SearchForm` or `SearchSuggestions` |

## Anatomy

- **Title** (`title`) and, in a drawer, the **trigger** (`drawerTriggerLabel`)
  with the active-filter count.
- **Active filters**: removable chips plus `Clear filters` (`activeFilters`,
  `onRemoveFilter`, `onReset`).
- **Groups** in an Accordion: option groups of FormCheckboxes with optional
  counts, range groups with a two-thumb Slider.
- **Show more / Show less** for long option groups (`collapseAfter`).
- **Pending status**: a StatusText while the app is updating results.

## Variants and states

There is no Figma component; these are the code options.

| Code | Meaning |
| --- | --- |
| `presentation="inline"` | A rail or in-page panel next to the results. |
| `presentation="drawer"` | The same content in a focus-managed side drawer (`drawerPlacement`, `drawerSize`) opened by a trigger. |
| `size="sm" \| "md" \| "lg"` (default `md`) | Size of every checkbox and slider inside. `drawerSize` is the drawer width, not a control size. |
| option `count` | How many results the option would give. Zero is information, not disabled. |
| option `disabled` | The option can't be chosen. Use it consistently if the app disables zero-result options. |
| `pending` | Results are updating: editing is blocked and values stay. |
| `disabled` | Editing is unavailable; values stay. |
| `readOnly` | Values are shown and focusable but can't change; chip removal and reset are hidden. Groups still expand. |
| group `emptyLabel` | A group with no options says so instead of disappearing. |

## Behaviour

**May:** report option changes, continuous range changes (`onRangeChange`)
and committed range changes (`onRangeChangeEnd`), chip removal and reset.

**Must not:** reset scroll or other filters when one facet changes; drop
selections when the drawer closes.

- Inline on desktop, changes apply as they happen; fetch on
  `onRangeChangeEnd`, not on every slider move.
- In the drawer, closing keeps the selections (they live in the app). Focus
  returns to the trigger only once the drawer has really closed.
- Removing a chip moves focus to the next chip, then the previous one; after
  `Clear filters` or the last chip, focus goes to a facet control.
- Render one presentation at a time; never mount a hidden inline copy next to
  the drawer.
- A draft-and-apply flow (`Show 24 results`) is the app's to build; the panel
  has no Apply step.

## Content and copy

- Facet titles are nouns: `Brand`, `Price` — cs: `Značka`, `Cena`.
- Counts and range values use the app locale (`formatValue`) — cs: `1 200 Kč`.
- Each chip has a `removeLabel` naming what it removes: `Remove Linen` — cs:
  `Odebrat Len`.
- Range thumbs get distinct names through the group's `aria-label`:
  `Minimum price`, `Maximum price` — cs: `Minimální cena`, `Maximální cena`.
- Localise `activeFiltersLabel`, `resetLabel` (`Clear filters` — cs:
  `Zrušit filtry`), `showMoreLabel`, `showLessLabel`, `pendingLabel`.

## Accessibility

- The kit provides the drawer's focus trap and return, the trigger's
  `aria-expanded`, the Accordion and checkbox semantics, and focus repair after
  chip removal.
- Disabled and pending controls leave the tab order; the scroll area stays
  keyboard reachable.
- Option labels must be distinguishable when read alone (`Black` in Colour vs
  `Black` in Brand needs the group context or a fuller label).

## Edge cases

- **Groups arrive after the first render**: option groups open by default
  unless the app controls `expandedGroups`.
- **App rejects closing the drawer** (controlled `drawerOpen`): focus stays in
  the drawer.
- **Filter leaves no results**: the listing shows the no-results state with
  `Clear filters`; the panel keeps the selection so the user can undo it.

## Related

- [States](../../ux-guidelines/references/states.md): no-results and pending.
- [Value lifecycle](../../ux-guidelines/references/value-lifecycle.md): draft vs committed range.
- [Dialog](../../dialog-usage/references/ux.md): the drawer it opens.
- [Slider](../../slider-usage/references/ux.md): range groups.
