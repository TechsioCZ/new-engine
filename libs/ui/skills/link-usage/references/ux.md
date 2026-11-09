<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/link--2774-37368.md, edited. Storybook: Atoms/Link → UX guidelines. -->

# Link: UX guidelines

A Link takes the user to a named destination: another page, a section or a
file. Its text says where it goes before the user activates it.

## When to use

- Navigation inside text, lists, breadcrumbs and footers.
- Record names in tables: link the name, not a separate `View` column.

## Use something else when

| Need | Use instead |
| --- | --- |
| Navigation that must look like a button | `LinkButton` |
| An action that changes data or confirms something | `Button` |
| An icon-only action | `ActionIcon` |

## Anatomy

- **Text**: the destination. Always visible, always underlined.
- **External or download cue** (optional): tells the user before they go that
  the link leaves the app or downloads a file.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| — | `size="sm" \| "md" \| "lg"` (default `md`) | Text size. `current` inherits the paragraph's typography for inline links. |
| `state=hover`, `active` | not props | Browser states. A press is not the current page. |
| `state=visited` | none | The kit has no visited style. If an app adds one, it never means read, done or approved. |
| `state=disabled` | none | Link has no `disabled`. Render plain text, or use `LinkButton` with `disabled`, which really blocks navigation. |
| — | `external` | Opens in a new tab with safe `rel`. Say so in the text. |

## Behaviour

**May:** open the named page, section or file.

**Must not:** delete, add to cart or change any data; discard an unsaved draft
without the app's leave-page handling.

- Only the page that actually loads is "current". Opening a navigation branch
  or a panel is not a page change.
- An unavailable destination is never styled as a clickable link without an
  explanation. Show text, or explain on arrival and offer a way back.
- Following a link to instructions never counts as having done those steps.

## Content and copy

- Destination-first, sentence case: `Order detail`, `Returns policy` — cs:
  `Detail objednávky`, `Reklamační řád`.
- Never `here`, `click here` or `more` on their own — cs: never `Zde`.
- Mark new tabs and downloads: `Price list (PDF, 2 MB)`, `Help centre (opens in a new tab)`.

## Accessibility

- The kit renders a native anchor (or your router adapter through `as`) with
  an underline in every theme and a visible focus ring, so links never rely on
  colour alone.
- Link text must make sense in a screen reader's list of links.
- Current, visited and unavailable are different things; never style one to
  look like another.

## Edge cases

- **Destination removed or forbidden**: don't keep a live-looking link; show the
  name as text or explain on the target page with a way back.
- **Link to instructions** (`How to file a claim`): it opens the guide, nothing
  more; don't show the task as started.

## Related

- [UX writing](../../ux-guidelines/references/ux-writing.md): link text.
- [Component selection](../../ux-guidelines/references/component-selection.md): Link vs LinkButton vs Button.
- [LinkButton](../../link-button-usage/references/ux.md): prominent navigation.
