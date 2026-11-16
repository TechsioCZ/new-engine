<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/radiogroup-item--2774-33126.md, edited. Storybook: Molecules/RadioGroup → UX guidelines. -->

# RadioGroup: UX guidelines

A RadioGroup asks one named question and accepts exactly one short answer from
options that are all visible.

## When to use

- One choice from 2–5 short options that should all be visible: delivery
  speed, invoice type, report period.
- Changing the answer has no irreversible side effect.

## Use something else when

| Need | Use instead |
| --- | --- |
| Options need a description or price | `RadioCard` |
| 6 or more options | `Select` |
| Several independent choices | `FormCheckbox` group |
| On / off | `Switch` or `FormCheckbox` |

## Anatomy

- **Group label**: `RadioGroup.Label`, the question (the legend).
- **Items**: `RadioGroup.ItemGroup` → `RadioGroup.Item` with
  `ItemHiddenInput`, `ItemControl` and `ItemContent` (`ItemText`, optional
  `ItemDescription`).
- **Status text**: `RadioGroup.StatusText` for help and the group's error.

Figma documents only the item; the label, orientation and error belong to the
group in code.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `variant=outline` / `subtle` / `solid` | `appearance="outline" \| "subtle" \| "solid"` | Visual style only; still exactly one answer. |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` | Density only. |
| `state=default` | not selected | No answer yet; not an error. |
| `state=checked` | the item matching `value` | The current answer, not proof it was saved. |
| `state=disabled` | `disabled` (group) or `disabled` on an item | Not available now, for a reason the user can find. |
| `state=invalid` | `validateStatus="error"` on the group | The group's answer is missing or invalid; the status text says what to fix. |
| — | `readOnly` | Answer visible and focusable, submitted, can't change. Figma has no read-only state. |
| — | `orientation="horizontal" \| "vertical"` | Layout; vertical for longer labels. |

## Behaviour

**May:** change the single answer within one group.

**Must not:** stand in for several independent toggles; run an irreversible
operation just because the answer changed.

- Changing the answer is a draft until the form is submitted. Instant effect is
  only for view switches, where the result is visible at once.
- An option that is unavailable for this case is a disabled item with its
  reason; a missing required answer is an error on the group. Don't mix them.
- Preselect a safe default when one exists; otherwise leave the group empty
  and validate on submit.

## Content and copy

- The group label states the question: `Delivery speed` — cs:
  `Rychlost doručení`.
- Option labels are short, parallel in grammar, without trailing punctuation:
  `Standard`, `Express` — cs: `Standardní`, `Expresní`.
- Order options logically (frequency, size, alphabet) and keep that order
  across the app. Order never relies on colour.
- An error describes the problem with filling in the group, not the person or
  team chosen: `Choose a delivery speed` — cs: `Vyberte rychlost doručení`.

## Accessibility

- The kit renders a named `radiogroup` with native radios, arrow-key movement
  and descriptions linked to each input.
- Checked differs from focused, and invalid from disabled, by more than
  colour.
- Keep `RadioGroup.Label` mounted even when every option becomes unavailable;
  focus falls back to the group.

## Edge cases

- **One option unavailable** (`Express` not offered for this address): disable
  that item and say why; it is not the group's error.
- **List grows past five**: switch to `Select` instead of an overloaded group.
- **Answer becomes unavailable after it was chosen**: keep the label, explain
  it near the group and ask for a new choice; don't silently pick another.

## Related

- [Component selection](../../ux-guidelines/references/component-selection.md): RadioGroup vs RadioCard vs Select.
- [States](../../ux-guidelines/references/states.md): read-only vs disabled, validation.
- [RadioCard](../../radio-card-usage/references/ux.md): options with descriptions.
