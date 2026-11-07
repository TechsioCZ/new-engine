<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/verticalnavigation--3539-102.md (+ verticalnavigation-group, -grouplabel, -link, -branch, -branchcontent, -separator), edited. Storybook: Molecules/VerticalNavigation → UX guidelines. -->

# VerticalNavigation: UX guidelines

VerticalNavigation lists named destinations in groups and expandable branches.
It tells three things apart: the page shown now (`current`), its ancestors
(`containsCurrent`), and a branch that is merely open.

## When to use

- Site or app navigation with groups and nested sections: admin navigation
  inside a Sidebar, category navigation in a storefront Drawer.

## Use something else when

| Need | Use instead |
| --- | --- |
| Choosing a data item in a hierarchy | `TreeView` |
| A hierarchical form value | `CascadeSelect` |
| The whole responsive app frame | `Sidebar` (with VerticalNavigation inside) |
| Switching views within a page | `Tabs` |

## Anatomy

- **Root** (`VerticalNavigation`): a named `nav`.
- **Group** (`VerticalNavigation.Group`) with a **GroupLabel**: names a
  section. The label is not a link.
- **List** / **Item**: the destinations.
- **Link** (`VerticalNavigation.Link`): one named page.
- **Branch** (`VerticalNavigation.Branch`): a **Row** with the parent Link
  and a **BranchTrigger** + **BranchIndicator**, then **BranchContent** with
  the child links. Opening the branch is separate from visiting the parent.
- **Separator**: only between groups that are present, outside List.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `size=sm` / `md` | `size="sm" \| "md" \| "lg"` | Density. `lg` exists in code (prominent or touch navigation) but not in Figma. |
| Link `state=current` | `current` on `VerticalNavigation.Link` (`aria-current="page"`) | Only the page shown now. Not "visited" and not "done". |
| Branch `state=currentPath` | `containsCurrent` on `VerticalNavigation.Branch` | An ancestor of the current page. Opening a branch doesn't make it one. |
| Branch `open=true` / `false` | `open` / `defaultOpen` + `onOpenChange` | Disclosure only; it never changes the page. |
| `state=disabled` | `disabled` on Link; `disabled` on Branch | A disabled link can't navigate. Branch `disabled` blocks only the disclosure, not the parent link. |
| `tone=plain` / `subtle` / `accent`, `variant=primary` / `secondary` | same props on `Group` and `BranchContent` | Surface emphasis only; never marks the current page, a selection or an error. |
| `indent`, `showGuide` | same props on `BranchContent`; `maxIndentDepth` on the root | Help read the hierarchy; not a way to mark the current page. |

## Behaviour

**May:** open a named destination; expand or collapse a branch of child
destinations; show the current page and the path to it.

**Must not:** treat opening a branch as changing page; use a navigation item
for a hidden data change or deletion; mix actions (`New product`) into
navigation.

- The router owns `current` and `containsCurrent`; the page actually shown
  decides them, not the last hover or the last branch opened.
- Expanding `Purchasing` doesn't make its first child current.
- Deep nesting never strips a destination of its readable name; past
  `maxIndentDepth` the indent stops growing but the structure stays.
- An unavailable destination is disabled or explained on its page; it never
  navigates silently.

## Content and copy

- Destinations and group labels are nouns in sentence case: `Orders`,
  `Suppliers` — cs: `Objednávky`, `Dodavatelé`.
- Same-named destinations in different branches get context in the label or
  the group.
- Counts appear as a `Badge` only for actionable queues (`Orders 3`).

## Accessibility

- Give the root an `aria-label` (`Product categories` — cs:
  `Kategorie produktů`) and each icon-only BranchTrigger a specific name
  (`Toggle fasteners`).
- Tab moves through links and triggers; Enter or Space toggles a branch.
  There is no tree keyboard model — that's TreeView.
- Current uses underline and weight, not colour alone.
- Long names and narrow widths wrap rather than hide the destination.

## Edge cases

- **Purchasing agenda in an ERP**: expanding the branch doesn't mark its first
  subpage as current.
- **Customer account on a narrow screen**: long names wrap; every destination
  stays recognisable.
- **Project portal**: `containsCurrent` is location, never a sign that
  documents in that section are approved; a disabled link does not navigate.

## Related

- [Sidebar](../../sidebar-usage/references/ux.md): the app frame.
- [TreeView](../../tree-view-usage/references/ux.md): hierarchical data with selection.
- [Accessibility](../../ux-guidelines/references/accessibility.md): landmarks and current page.
