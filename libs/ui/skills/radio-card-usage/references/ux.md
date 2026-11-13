<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/radiocard-item--2774-33564.md, edited. Storybook: Molecules/RadioCard → UX guidelines. -->

# RadioCard: UX guidelines

A RadioCard group offers a few mutually exclusive options whose differences
need more than a name: a description, price or delivery time.

## When to use

- 2–4 exclusive choices that need explaining: shipping method, plan, payment
  method.
- The whole set answers one question.

## Use something else when

| Need | Use instead |
| --- | --- |
| Short text options | `RadioGroup` |
| Many options | `Select` |
| Several can be chosen | `FormCheckbox` group |

## Anatomy

- **Group label**: `RadioCard.Label`, the question.
- **Card**: `RadioCard.Item` → `ItemHiddenInput` + `ItemControl` with
  `ItemContent` (`ItemText` title, `ItemDescription`), optional `ItemAddon`
  (price, icon) and `ItemIndicator`.
- **Status text**: `RadioCard.StatusText` for help and the group's error.

The whole card is the control. Keep `ItemHiddenInput` (native radio, form
value) and `ItemIndicator` (checked state not shown by surface colour alone).

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `variant=outline` / `subtle` / `solid` | `appearance="outline" \| "subtle" \| "solid"` | Visual style only; still exactly one answer. |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` | Density only. |
| `state=default` | not selected | Not chosen; not an error. |
| `state=checked` | the item matching `value` | The current choice, not a completed order. |
| `state=disabled` | `disabled` (group) or `disabled` on an item | Not offered now; the card says why. |
| `state=invalid` | `validateStatus="error"` on the group | Required choice missing; the status text says what to do. |
| — | `readOnly` | Choice visible and focusable, submitted, can't change. Not in Figma. |
| — | `itemOrientation`, `align`, `justify` | Layout inside a card; not in Figma. |

## Behaviour

**May:** choose one option of the named group; expose the description as part
of the decision.

**Must not:** allow several answers where the rule is one; treat choosing a
card as completing the order or purchase.

- Choosing a card only changes the choice. The commit (`Continue`,
  `Place order`) is a separate button outside the cards.
- Don't put links or buttons inside a card; the card is the control. Put
  "compare plans" or "details" next to the group.
- A missing required choice is checked at submit, not when the page opens.
- Preselect the recommended or cheapest option only when a default is safe,
  and say why in its description.

## Content and copy

- Title is the option name; the description is one line with the decisive
  difference: `Standard` / `3–5 business days` — cs: `Standardní doprava` /
  `Doručení za 3–5 pracovních dní`.
- Prices in the app locale, aligned at the end; zero is `Free` — cs: `Zdarma`.
- Keep every card in the group the same structure and height.

## Accessibility

- The kit renders native radios in a named `radiogroup`; descriptions are
  linked to each input and stay readable by assistive technology.
- Checked differs from focused, invalid and disabled by more than colour
  (the indicator).
- A disabled card can't be chosen by clicking its text either.

## Edge cases

- **Shipping method unavailable for this address**: disable the card and
  explain why on it; don't hide it silently if the user expects it.
- **Previously chosen plan withdrawn**: show it as unavailable and ask for a
  new choice before continuing; never switch plans silently.
- **Options can be combined**: that's a multi-select; use checkboxes.

## Related

- [Component selection](../../ux-guidelines/references/component-selection.md): RadioCard vs RadioGroup.
- [Formatting](../../ux-guidelines/references/formatting.md): prices.
- [RadioGroup](../../radio-group-usage/references/ux.md): short options.
