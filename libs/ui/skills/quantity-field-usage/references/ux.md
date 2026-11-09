<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/quantityfield--3861-1334.md (+ quantityfield-compact-long-unit, quantityfield-akros-control-height-override reference frames), edited. Storybook: Molecules/QuantityField → UX guidelines. -->

# QuantityField: UX guidelines

QuantityField changes how much of one item the user wants, in the item's
unit, and shows whether that change is still a draft, being saved, saved or
rejected.

## When to use

- Product, cart and repeat-order quantities with a visible unit, limits and an
  update that the app saves.

## Use something else when

| Need | Use instead |
| --- | --- |
| A general labelled number | `FormNumericInput` |
| A bare numeric control | `NumericInput` |
| Identifiers such as SKU or postal code | `Input` / `FormInput` |

## Anatomy

- **Label**: names the quantity. `hideLabel` hides it visually only; the
  field keeps its accessible name.
- **Control**: the NumericInput engine with steppers and a visible **unit**
  (`unitLabel`: pieces, metres, packs).
- **Helper** (`helperText`), **error** (`error`) and **pending message**
  (`pendingLabel`): all linked to the input; helper and error may coexist.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` | Density only. |
| `state=default` | no `error`, not `pending` | No known problem. Not proof the quantity was saved. |
| `state=error` | `error` | The quantity was rejected or its update failed. The draft stays; the message gives the real reason. |
| `state=pending` | `pending` + `pendingLabel` | An update is really in progress. Typing and stepping are blocked; the shown number is not confirmed yet. |
| `state=disabled` | `disabled` | Not usable now, for a reason the user can find. |
| `state=readonly` | `readOnly` | Readable, focusable and copyable; no steppers. Not disabled and not zero. |
| `hideLabel=true` | `hideLabel` | Only when the row makes the meaning obvious; the accessible name stays. |

## Behaviour

**May:** accept a typed quantity or step it within the bounds; tell draft,
pending and saved apart.

**Must not:** treat zero or empty as removing the item; let an older response
overwrite a newer quantity; present an out-of-stock limit as a failed save.

The flow follows the [value lifecycle](../../ux-guidelines/references/value-lifecycle.md):

1. The confirmed quantity becomes a draft when the user edits it. Empty and
   out-of-range drafts stay editable; the field never clamps them silently.
2. The app decides when to commit (`onValueCommit` is only the blur/Enter
   event) and validates bounds and whole units.
3. While saving, `pending` with a localized `pendingLabel`.
4. Success aligns the quantity and every recalculated total with the result.
   Failure keeps the draft with `error`.
5. Cancelling before the commit restores the confirmed quantity.
6. Each response is tied to its item and request; a late response for an
   older quantity is discarded.

## Content and copy

- The unit matches the real pack (`packs of 6`), and never disappears or
  overlaps the value or steppers, even in a compact row with a long unit.
- Pending: `Updating quantity…` — cs: `Aktualizujeme množství…`
- Limit error: `Choose a quantity between 1 and 20.` — cs:
  `Zvolte množství od 1 do 20.`
- Stock and save failures read differently: `Only 3 in stock.` vs
  `The quantity couldn't be saved. Try again.`

## Accessibility

- The kit links unit, helper, error and pending text to the input and sets
  `aria-busy` while pending.
- `aria-label` and `aria-labelledby` target the input, not the wrapper.

## Edge cases

- **Rapid changes in the cart** (2 → 3 → 4): the response for 3 arriving after
  4 is ignored; the field ends on 4.
- **Typed above stock**: the draft stays readable and the message gives the
  allowed range.
- **Decrement to zero**: no silent removal; the line has a separate Remove
  action.
- Figma reference frames *Compact long unit* and *Akros control height
  override* are examples, not extra variants; a brand height override stays
  in that brand's tokens.

## Related

- [NumericInput](../../numeric-input-usage/references/ux.md): stepper and draft rules.
- [LineItem](../../line-item-usage/references/ux.md): the cart row around it.
- [Value lifecycle](../../ux-guidelines/references/value-lifecycle.md): draft, pending, confirmed.
