<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/breadcrumb--2774-25431.md (+ token-icon-breadcrumb-ellipsis, token-icon-breadcrumb-separator), edited. Storybook: Molecules/Breadcrumb → UX guidelines. -->

# Breadcrumb: UX guidelines

Breadcrumb shows where the current page sits in the real hierarchy and lets
the user go back up to its ancestors. It is a map of the structure, not of the
user's click history.

## When to use

- Pages three or more levels deep (catalog → category → product; admin →
  section → record).
- Detail pages and record editors, so users can return to the list above.

## Use something else when

| Need | Use instead |
| --- | --- |
| Return to the previous screen in the user's history | a `Back to list` Button in the page header |
| Progress through the stages of a task | `Steps` |
| Switching peer views | `Tabs` |
| Primary site navigation | `Header`, or `Sidebar` + `VerticalNavigation` |

## Anatomy

- **List** (`Breadcrumb.List`) of **Items** (`Breadcrumb.Item`).
- **Ancestor links** (`Breadcrumb.Link`): real pages above the current one.
- **Current page** (`Breadcrumb.CurrentLink`): plain text with
  `aria-current="page"`, never a link to itself.
- **Separator** (`Breadcrumb.Separator`): decoration between levels, not a
  target.
- **Ellipsis** (`Breadcrumb.Ellipsis`): stands for the collapsed middle
  levels. It is not another page.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` | Density only; links inherit the trail's size. |
| — | `appearance="plain" \| "underline"` | Link decoration. Not in Figma yet. |
| ellipsis glyph | `Breadcrumb.Ellipsis`; `maxItems` on `BreadcrumbTemplate` | Collapses the middle. `maxItems` keeps the root and the trailing items, and the current page is always among them. |
| separator glyph | `Breadcrumb.Separator` | Icon from the component; never a typed `/` or `>`. |

## Behaviour

**May:** open a real ancestor of the current page; when the trail is
collapsed, give access to the hidden levels.

**Must not:** replace the Back button or the history of an unfinished task;
hide both the start of the trail and the current page.

- The page that is actually displayed decides the current item. An explicit
  `isCurrent` ends the trail; nothing after it renders.
- The same record reached from search or from a list shows the same
  ancestors: the hierarchy, not the last click.
- Navigating away never silently saves or drops an unsaved draft; the page's
  leave-guard decides.
- An unavailable ancestor explains itself and offers a way back instead of a
  dead link.

## Content and copy

- Labels are page names in sentence case, the same as the navigation and page
  titles: `Orders`, `Order 2024-0153` — cs: `Objednávky`, `Smlouvy`.
- Keep the page title as well; the last breadcrumb doesn't replace it.
- Long product codes wrap; the current label is never truncated.

## Accessibility

- The kit renders a `nav` with an ordered list and marks the current page
  with `aria-current="page"`; separators are hidden from assistive tech.
- The default `aria-label` is `breadcrumb`. Pass a localised one — cs:
  `aria-label="Drobečková navigace"`.
- **Rule:** collapsed levels must stay reachable by keyboard and screen
  reader, through a control that reveals them.

## Edge cases

- **Collapsed trail (current limitation)**: `Breadcrumb.Ellipsis` is
  currently decorative (`aria-hidden`, `role="presentation"`), so the levels
  it hides can't be reached from the trail. Until it becomes a real control,
  keep `maxItems` generous enough that no level the user needs is hidden, or
  provide the same ancestors elsewhere (the sidebar or a parent link in the
  page header).
- **Long catalogue path on mobile**: shorten the middle and keep the root and
  the trailing pages.
- **Draft contract in a document archive**: the trail shows location only and
  never implies the contract was saved or approved.

## Related

- [Component selection](../../ux-guidelines/references/component-selection.md): navigation components.
- [Accessibility](../../ux-guidelines/references/accessibility.md): landmarks and names.
- [Steps](../../steps-usage/references/ux.md): progress through a task.
