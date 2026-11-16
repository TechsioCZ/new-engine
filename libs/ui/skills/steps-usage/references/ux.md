<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/steps--2774-33928.md, edited. Storybook: Molecules/Steps → UX guidelines. -->

# Steps: UX guidelines

Steps shows progress through an ordered task: which stage is current, which
are complete and what remains. Visiting a stage is not completing it.

## When to use

- Ordered multi-step tasks with a clear sequence: checkout, booking,
  onboarding, import wizards (3–7 steps).

## Use something else when

| Need | Use instead |
| --- | --- |
| Peer views the user switches between freely | `Tabs` |
| Location in a page hierarchy | `Breadcrumb` |
| Pages of results | `Pagination` |
| Tasks done in any order, possibly on different days | a task list or checklist, not a forced linear Steps |
| Explaining existing UI | `Tour` |

## Anatomy

- **List** (`Steps.List`) of **Items** (`Steps.Item`), each with a
  **Trigger**, **Indicator** (number, or status when complete), **Title**,
  optional **Description**, and a **Separator** to the next item.
- **Panels** (`Steps.Panels`): one **Content** per step and
  **CompletedContent** after the last step.
- **Progress** (`Steps.Progress`, optional): the same progress as a bar.
- **Navigation** (`Steps.Navigation`): **PrevTrigger** (`Back`) and
  **NextTrigger** (`Continue`).

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `variant=subtle` / `solid` | `appearance="subtle" \| "solid"` | Visual only; a variant is never an extra step. |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` | Indicator and stage typography; Back/Continue follow the shared control heights. |
| current | `step` / `defaultStep` (`aria-current="step"`) | The stage that is open now. |
| complete | steps before the current one | Only reached after the stage's conditions passed (`isStepValid`). |
| default | steps after the current one | Not started yet. |
| — | `linear` | Disables jumping from the list; progress only through Back and Continue. |
| — | `orientation="horizontal" \| "vertical"` | Layout only. |

## Behaviour

**May:** show the current, complete and not-yet-started stages of a real
process; allow going back where the flow supports it.

**Must not:** mark a visited stage as complete; act as peer tabs or as a list
of independent tasks with no fixed order.

- `Continue` checks the stage first. A failure keeps the user on the stage
  with the draft and the message next to the field
  ([Value lifecycle](../../ux-guidelines/references/value-lifecycle.md)).
  Gate jumps from the list too (`isStepValid`, or gate a controlled
  `onStepChange`), so a jump can't bypass validation.
- Going back keeps entered data, and re-validates later stages that the
  change may have invalidated.
- Reaching the summary is not submitting. The final action has its own
  named button (`Place order`) and its own confirmation.

## Content and copy

- Step titles are short nouns for the stage: `Shipping`, `Payment`, `Review`
  — cs: `Doprava`, `Platba`, `Souhrn`. Never just a number.
- Navigation: `Back` and `Continue` — cs: `Zpět`, `Pokračovat`; the last
  step's button names the real result.
- Progress for assistive tech: `Step 2 of 4` — cs: `Krok 2 ze 4`.

## Accessibility

- Steps is an ordered list of ordinary buttons with `aria-current="step"`,
  not a tab widget. After Back or Continue, focus moves to the new panel.
- Current, complete and not-started differ by more than colour (number vs
  check, text weight).
- Localise the completion region's name (`aria-label` on
  `Steps.CompletedContent`; default `Workflow complete`).

## Edge cases

- **Request with invalid line items**: the indicator never moves to the
  complete stage until the check passes.
- **Service booking**: opening the summary doesn't claim the booking was
  saved; only the final confirm does.
- **Onboarding tasks in any order**: use a task list instead of a linear
  Steps.

## Related

- [Value lifecycle](../../ux-guidelines/references/value-lifecycle.md): draft vs confirmed per stage.
- [Feedback and actions](../../ux-guidelines/references/feedback-and-actions.md): `[Back] [Continue]` placement.
- [Tabs](../../tabs-usage/references/ux.md): peer views.
