<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/icon--2774-9582.md and the 77 token-icon-token-icon-*.md glyph docs, edited. Hosts taken from libs/ui code, not from the docs' "Vazba". Storybook: Atoms/Icon → UX guidelines. -->

# Icon: UX guidelines

An Icon adds a recognisable symbol to text, a status or a named control. It
never acts on its own and never carries the only copy of the meaning.

## When to use

Decide what the icon is first:

- **Decorative**: it repeats what the text next to it says. Leave it
  `aria-hidden` (the default).
- **Informative**: it means something and no text says it. Give it `label`
  (renders `role="img"`), or add visible text.
- **Inside a control**: the control (Button `icon`, ActionIcon, a component's
  own slot) owns the name and the action. Never put `label` on that icon.

## Use something else when

| Need | Use instead |
| --- | --- |
| A clickable icon | `ActionIcon` with `aria-label`, or `Button` with `icon` |
| An icon inside a component that has an `icon` prop | that prop, not a separate Icon |
| A status message | `StatusText` (it brings its own glyph) |

## Anatomy

The glyph, its size and its colour. Name and activation belong to the host;
swapping a token never changes how the host behaves.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `size=current` | `size="current"` (default) | 1em of the surrounding text in code; a fixed 16 px preview in Figma. Compare it with the text around it, not with the Figma number. |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` | The canonical steps for standalone glyphs. |
| `size=xs` / `xl` / `2xl` | `size="xs" \| "xl" \| "2xl"` | Compact or decorative composition only, not control sizes. |
| `color=current` | `color="current"` (default) | Inherit the host's foreground. Use this inside controls. |
| `color=primary` … `warning` | `color="primary" \| "secondary" \| "danger" \| "success" \| "warning"` | Readable semantic foregrounds. Only when the text says the same thing. |

## Behaviour

**May:** show the symbol that matches the meaning of its slot, and change
together with the host's text when the host's state changes.

**Must not:** start an operation, add a focus stop, or say something different
from its host's text.

- One glyph, one meaning, everywhere. Never reuse a glyph on the next row for a
  different action.
- Colour alone never says unavailable, failed or purchased.

## Glyph meanings

The kit's semantic glyphs are `token-icon-*` classes. Pick by meaning, not by
picture. Per-glyph behaviour rules (what the action may and must not do) live
on the host's page; the table is the index. ⚠ marks a glyph the design file has
but the code token set doesn't: the host uses the Iconify class shown.

| Glyph (`token-icon-…`) | Meaning | Host component(s) | Never means |
| --- | --- | --- | --- |
| `accordion-chevron` | Section expands or collapses | Accordion | Confirming a value; navigation |
| `breadcrumb-ellipsis` | Hidden path levels | Breadcrumb | A record's edit menu |
| `breadcrumb-separator` | Boundary between path levels | Breadcrumb | — |
| `carousel-next` | Next slide | Carousel, Gallery | A different product; submitting |
| `carousel-prev` | Previous slide | Carousel, Gallery | Going back a step in a process |
| `cart` | The cart (open it) | app header; base of ProductCard's `cart-button` | Adding a product |
| `cart-button` | Add this offer to the cart | ProductCard | Opening the cart; a placed order |
| `check` | Confirmed choice | Select, Menu, Combobox, CascadeSelect, Steps, DataTable | — |
| `checkbox` | Checked mark | Checkbox, FormCheckbox | — |
| `chevron-down` | Down; expand; open list | Accordion, Select, Combobox, Menu, TreeView, Carousel, VerticalNavigation, DataTable (sorted descending) | — |
| `chevron-left` | Left; previous | Pagination, Carousel, DatePicker | — |
| `chevron-right` | Right; next; submenu | Pagination, Carousel, DatePicker, Breadcrumb, Menu, TreeView, CascadeSelect, DataTable | — |
| `chevron-up` | Up; collapse | Select, Carousel, DataTable (sorted ascending) | — |
| `clipboard` | Clipboard | app use (Steps story) | Copy or paste by picture alone; name the command |
| `close` | Close a named layer; in fields, clear | Dialog, Drawer, Toast, Popover, Tour, Header, Sidebar; clear in Select, Combobox, DatePicker, FileUpload, SearchForm; FacetFilterPanel chips; DataTable | Saving or deleting data |
| ⚠ `cog` | Table settings (column visibility) | DataTable (`icon-[mdi--cog-outline]`) | Changing a setting without the user's choice |
| `color-select` | Chosen colour | ColorSelect | — |
| `combobox-chevron` | Open the option list | Combobox | Confirming the highlighted option |
| `combobox-clear` | Clear the value or query | Combobox | Deleting the record behind the selection |
| `copy` | Copy a value to the clipboard | app use (ActionIcon, Menu items) | Cloning the record |
| `detail-button` | Open the product detail | ProductCard | Adding to the cart |
| `dialog-close` | Close this dialog | Dialog | Confirming or saving |
| ⚠ `drag-horizontal` | Row reorder handle | DataTable (`icon-[mdi--drag-horizontal]`) | Moving a column; changing cell values |
| ⚠ `drag-vertical` | Column reorder handle | DataTable (`icon-[mdi--drag-vertical]`) | Moving a row |
| `ellipsis-horizontal` | More options; skipped items | Pagination, Breadcrumb; app "More actions" | Running a hidden command instead of opening a menu |
| `error`, `success`, `warning` | Status | StatusText (through `status-text-*`) | — |
| `eye` | Show or preview | ProductCard (through `detail-button`) | Changing permission, publication or a value |
| ⚠ `filter` | Open filter conditions | DataTable column filter, FacetFilterPanel trigger (`icon-[mdi--filter-variant]`) | Deleting the rows it hides |
| `folder` | Branch node | TreeView (through `tree-node`) | — |
| `heart` | Favourite | ProductCard (through `wishlist-button`) | Saved before the server confirms; a rating |
| `info` | Information | no kit host (base of `input-info`) | — |
| `input-error`, `input-info`, `input-success`, `input-warning` | Field validation state | no kit host: fields show validation through StatusText (`status-text-*`) | — |
| `menu-check` | Checked menu item | Menu | — |
| `menu-submenu` | Opens a submenu | Menu | — |
| `menu-trigger` | Opens a command menu | Menu | Running the first command |
| `numeric-input-decrement` | Decrease by one step | NumericInput (and FormNumericInput, QuantityField) | Removing the item at zero |
| `numeric-input-increment` | Increase by one step | NumericInput (and FormNumericInput, QuantityField) | Passing the limit; converting the unit silently |
| `pagination-ellipsis` | Skipped pages | Pagination | — |
| `pagination-next` | Next page of the same results | Pagination | Changing filters; acting on selected rows |
| `pagination-prev` | Previous page | Pagination | Browser or app history back |
| `plus` | Add an item | app use (Button `icon`, Accordion story) | Submitting or approving the draft |
| `radio-card-checked` | Selected card | RadioCard | — |
| `radio-group-checked` | Selected option | RadioGroup | — |
| `rating`, `rating-half` | Full and half rating point | Rating | — |
| `redo` | Redo an operation the app can really redo | app use | Resubmitting an uncertain request |
| ⚠ `row-edit` | Start editing this row | DataTable (`icon-[mdi--pencil-outline]`) | A confirmed change |
| `save` | Save changes | app use | Success before the result; plain close |
| `search` | Run the query in the named scope | SearchForm | Auto-picking the first result |
| `select-check` | Selected option | Select | — |
| `select-clear` | Clear this selection | Select, CascadeSelect | Removing the option from the data |
| `select-indicator`, `select-indicator-open` | List closed or open | Select, CascadeSelect | A value that isn't selected; a second unnamed trigger |
| ⚠ `sort-unfold` | Sortable, not sorted yet | DataTable (`icon-[mdi--unfold-more-horizontal]`) | Not sortable; already sorted |
| `status-text-error`, `-success`, `-warning` | Message status | StatusText | — |
| `steps-check` | Completed step | Steps | — |
| ⚠ `table-empty` | Empty table | DataTable empty state (`icon-[mdi--table-off]`) | — |
| `toast-close` | Hide this notification | Toast | Undoing the reported operation |
| `toast-error`, `-info`, `-success`, `-warning` | Toast type | Toast | — |
| `trash` | Delete this item | FileUpload (through `file-upload-delete`); app ActionIcon | Hiding an irreversible result; deleting another row or the whole list |
| `tree-indicator`, `tree-indicator-open` | Branch collapsed or expanded | TreeView | — |
| `tree-item`, `tree-node`, `tree-node-open` | Leaf, branch, open branch | TreeView | — |
| `undo` | Undo the named previous operation | app use | An undo that can't happen; undoing an unrelated operation |
| `wishlist-button` | Save to the wishlist | ProductCard | Buying or reserving |

The code has more component glyphs than the design file documents
(`date-picker-*`, `file-upload-*`, `availability-status-*`, `spinner`, …);
they follow the same rules.

## Content and copy

- The token name is never user-facing text. A host that is a control names the
  result (`Delete product` — cs: `Smazat produkt`), not the picture.
- A decorative icon doesn't repeat text that is already there.

## Accessibility

- The kit renders Icon `aria-hidden` unless it has `label`; with `label` it is
  `role="img"`.
- Meaning stays available as text or structure, never only as colour, shape or
  position.
- Glyphs keep the system colour in forced-colours mode; the shared spinner is
  static under reduced motion.

## Edge cases

- **Same glyph, different action on the next row** (pencil for edit and for
  rename): choose a different glyph or use a labelled Button.
- **Icon colour as the only signal** (red cart = out of stock): add the text.
- **`current` looks wrong next to the text**: check it against the real
  typography; Figma's 16 px preview isn't the code size.

## Related

- [Accessibility](../../ux-guidelines/references/accessibility.md): names, and why a token name is never a label.
- [ActionIcon](../../action-icon-usage/references/ux.md): icon-only controls.
- [StatusText](../../status-text-usage/references/ux.md): status glyphs with text.
