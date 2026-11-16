<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/tabs--3963-26937.md (+ tabs-list, tabs-trigger, tabs-content, tabs-indicator), edited. Storybook: Molecules/Tabs → UX guidelines. -->

# Tabs: UX guidelines

Tabs switch between related panels on the same level, usually views of one
object. Each tab owns exactly one panel, and the selected tab always matches
the panel on screen.

## When to use

- Peer views of the same object or page: record sections (`Content`, `SEO`,
  `History`), product detail (`Description`, `Parameters`, `Reviews`),
  settings groups (vertical).

## Use something else when

| Need | Use instead |
| --- | --- |
| Stages that must be completed in order | `Steps` |
| Sections the user may want open at the same time | `Accordion` |
| Going to another page or URL | `Link`, `Sidebar` navigation |
| Content the user must compare side by side | one view, not tabs |

## Anatomy

- **List** (`Tabs.List`): the tabs of one switchable set, in a meaningful
  order.
- **Trigger** (`Tabs.Trigger`): names and selects its own panel.
- **Indicator** (`Tabs.Indicator`): marks the selected tab (`line` variant).
  It moves only when the panel changes, never on hover.
- **Content** (`Tabs.Content`): the panel for exactly one trigger.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `variant=default` / `line` / `solid` / `outline` | `appearance="underline" \| "line" \| "solid" \| "outline"` | Visual only; doesn't change which panels exist. |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` | Density only. |
| `orientation=horizontal` / `vertical` | `orientation` | Vertical for settings groups or long names; order and meaning stay the same. |
| `state=selected` | `value` / `defaultValue` | The panel actually shown. Hover never selects. Focus never selects in `manual`; in `automatic` (default) arrow keys select as they move focus. |
| `state=disabled` | `disabled` on `Tabs.Trigger` | The panel can't be opened now, for a reason the user can find. |
| — | `activationMode="automatic" \| "manual"` | Whether arrow-key focus also switches the panel. Not in Figma. |
| — | `fitted`, `justify="start" \| "center" \| "end"` | List layout. Not in Figma. |

## Behaviour

**May:** select a tab and show its panel; keep keyboard movement and
activation consistent across the whole set.

**Must not:** run an irreversible operation on switching; stand in for the
required order of `Steps` or for links to unrelated pages.

- Focus and the active panel are different things. Use one
  `activationMode` per set; choose `"manual"` when switching a panel is
  expensive (loads data), so moving focus doesn't trigger every load.
- Switching tabs never commits or discards data. A form in a panel keeps its
  draft, or the product warns before it is lost
  ([Value lifecycle](../../ux-guidelines/references/value-lifecycle.md)).
- A panel that fails to load says so inside the panel and offers a retry;
  the tab stays selected only if its panel is the one shown.

## Content and copy

- Labels are short nouns in sentence case: `Description`, `Reviews` — cs:
  `Popis`, `Hodnocení`.
- Counts go in a `Badge` or parentheses: `Orders (12)` — cs:
  `Objednávky (12)`.
- When an invalid field sits in a hidden tab, show it on that tab's label.

## Accessibility

- The kit provides `tablist` / `tab` / `tabpanel` roles, `aria-selected`,
  arrow-key movement with looping and the trigger–panel link.
- Selected, focused and hovered look different, not by colour alone.
- Long names and translations stay reachable: the horizontal list scrolls,
  vertical lists wrap.

## Edge cases

- **Order detail with a slow panel**: use `activationMode="manual"` so tabbing
  through doesn't load every panel; switching never drops an unsaved line
  item.
- **Product detail on the web**: hover never changes the active panel; long
  tab names stay reachable on mobile.
- **Unavailable panel**: it is never marked selected while other content is
  shown.

## Related

- [Component selection](../../ux-guidelines/references/component-selection.md): Tabs vs Accordion vs Steps.
- [Value lifecycle](../../ux-guidelines/references/value-lifecycle.md): drafts across panels.
- [Accordion](../../accordion-usage/references/ux.md), [Steps](../../steps-usage/references/ux.md).
