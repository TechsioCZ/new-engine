<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/colorswatch--2774-31312.md, edited. Storybook: Molecules/ColorSelect → UX guidelines. -->

# ColorSelect: UX guidelines

ColorSelect lets the user pick an offered colour from named swatches: a
product variant or a catalogue colour filter. The colour is never the only
way to tell the options apart.

## When to use

- Choosing a product colour variant on a product page.
- Filtering a catalogue by colour (`selectionMode="multiple"`).

The user must know whether they are choosing a product variant or filtering.

## Use something else when

| Need | Use instead |
| --- | --- |
| Any other value, or textual choices | `Select`, `RadioGroup` or `RadioCard` |
| A brand or theme colour in admin settings | a dedicated colour input, not swatches |
| A status that needs explaining (stock, price) | text or `AvailabilityStatus`, not a swatch |

## Anatomy

- **Group label**: `label` (default `Color`).
- **Swatches**: one per entry in `colors` (`color`, `label`, optional `count`,
  `selected`, `disabled`), in `layout="list" | "grid"`.
- **Swatch caption**: the colour name and, for filters, the result count.
- **Help text**: `helpText` + `validateStatus`.

Figma models a single swatch ("ColorSwatch"); code has no `ColorSwatch`
component. The group, its label and the selection mode belong to
`ColorSelect`.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| ColorSwatch (one swatch) | one entry in `colors` | A swatch only exists inside a `ColorSelect`. |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` | Density only. `full` also exists in code for full-width swatches. |
| `radius=sm` / `md` / `lg` / `full` | `radius` | Shape only; no meaning. |
| `state=selected` | `colors[].selected` (app state) | The chosen colour; shown with a check mark, not only a border. |
| `state=disabled` | `colors[].disabled` or group `disabled` | Not orderable now; the product page says why. |
| `state=hover`, `state=focus` | not props | Browser states; never select anything. |
| — | `readOnly` | Selection visible and submitted, can't change. Not in Figma. |
| — | `selectionMode="single" \| "multiple"` | One variant (radio) vs several filter colours (checkbox). |
| — | `layout="list" \| "grid"` | Arrangement of swatches. |

## Behaviour

**May:** choose an available swatch and confirm its name in text; keep focus
distinct from the chosen colour.

**Must not:** use colour as the only identifier of an offer; imply stock or a
successful save from the swatch.

- Hover and focus only highlight. Activation proposes the colour
  (`onColorClick`); the app updates `selected` and the matching variant data
  together.
- If loading the selected variant fails, don't show the old photo or price as
  the new variant; keep the previous selection and say what failed.
- A removed or disabled selected swatch never selects a neighbour by itself;
  the app decides how to reconcile.

## Content and copy

- Every swatch has the product's colour name, never a hex value: `Navy`,
  `Cream` — cs: `Námořnická modř`, `Smetanová`.
- Show the chosen name next to the group: `Colour: Navy` — cs: `Barva: Modrá`.
- Two similar greys need distinguishable names; the shade alone isn't enough.
- More than about 12 swatches need grouping or a `More colours` option.

## Accessibility

- Single mode is a radio group with roving focus; multiple mode uses checkbox
  semantics. A swatch's accessible name is built from its `label` and falls
  back to the raw colour value, so always pass `label`.
- Selected and unavailable differ from the rest by more than hue (check mark;
  explanation for unavailable).
- Light and near-identical swatches keep a visible boundary against the
  background and each other.

## Edge cases

- **Disabled colour hovered**: nothing changes; the confirmed product stays.
- **Variant data fails to load after choosing a colour**: no stale photo or
  price presented as the new variant.
- **Similar colours** (`Graphite`, `Anthracite`): distinct names in the
  swatch captions.

## Related

- [Component selection](../../ux-guidelines/references/component-selection.md): colour swatch choice.
- [Accessibility](../../ux-guidelines/references/accessibility.md): meaning without colour.
- [States](../../ux-guidelines/references/states.md): selected vs focused, read-only.
