<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/tour--3270-87.md, edited. Storybook: Molecules/Tour → UX guidelines. -->

# Tour: UX guidelines

A Tour is an optional, short guide through an interface that already exists.
The user can leave it at any time, start it again later, and go back to their
work.

## When to use

- Introducing new or changed UI in place, once, in 3–5 steps that point at
  real elements.
- A guide the user starts on request (`Start guide`).

## Use something else when

| Need | Use instead |
| --- | --- |
| Doing a real task step by step (a wizard, checkout) | forms with `Steps` |
| One contextual hint | `Tooltip` or visible help text |
| An independent modal task | `Dialog` |
| An instruction needed to finish a task | persistent inline help |

## Anatomy

- **Step panel**: `Tour.Title`, `Tour.Description`, `Tour.ProgressText`
  (`2 of 4`), `Tour.CloseTrigger`.
- **Actions**: `Tour.ActionTrigger` with `skip`, `prev`, `next`, `dismiss`.
- **Target**: the real element a step explains, highlighted by
  `Tour.Spotlight` over `Tour.Backdrop`, with `Tour.Arrow` pointing at it.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `type=tooltip` | step `type: "tooltip"` (with a `target`) | A short step anchored to a real, visible element. |
| `type=dialog` | step `type: "dialog"` | An intro or summary step that isn't tied to one control. |
| `type=floating` | step `type: "floating"` | A free-standing step, for when the target may be missing; never pretend a link to an element that isn't there. |
| — | step `type: "wait"` | No panel: waits for the app (a route change, the user connecting an account). Not counted in progress. |
| `dir=ltr` / `rtl` | `dir` | Reverses the logical layout, not the meaning of actions. |
| `showSkip`, `showBack`, `showNext`, `showClose`, `showProgress`, `showArrow` | the matching parts | Skip and close are always available. |

Choose the step type by what the step points at, not by looks.

## Behaviour

**May:** show a step at its target, move forward and back, and end the tour
early or at the end.

**Must not:** start on every visit; run a business operation on `Next`; be
the only place an essential instruction lives; block a critical task such as
checkout.

- `Next` and `Back` change which step is shown, never data.
- Skip and close are always reachable, independent of the step's target. The
  target is never the only way out.
- A missing target (hidden by permissions, not loaded yet) never traps the
  user: the app skips the step with an explanation or ends the tour safely.
  The kit waits about 3 s for a target, then ends with not-found; the
  fallback is the app's job.
- Completing the tour is not consent and not completion of the real task.
- The app decides when to start and remembers completion per user; the kit
  doesn't.

## Content and copy

- One idea per step: a short title and one sentence. Don't explain what the
  label already says.
- Progress `2 of 4` — cs: `2 z 4`. Buttons `Skip tour`, `Back`, `Next`,
  last step `Done` — cs: `Přeskočit prohlídku`, `Zpět`, `Další`, `Hotovo`.
- Translate the visible action labels; the kit only translates its own
  machine labels.

## Accessibility

- Each step panel is an `alertdialog` named by its Title and Description;
  keep both mounted.
- Arrow keys move between steps, except while the user is typing in a field.
- When the tour ends, focus returns to where the user can carry on, never to
  a hidden or missing element.
- Long descriptions scroll on their own; title, progress, close and actions
  stay reachable.

## Edge cases

- **The step's button is hidden by permissions**: skip the step or end the
  tour; focus doesn't land on an element that isn't there.
- **The user leaves mid-tour**: nothing is saved as "completed"; they can
  start it again from the trigger.

## Related

- [Accessibility](../../ux-guidelines/references/accessibility.md): focus on open and close.
- [Component selection](../../ux-guidelines/references/component-selection.md): Tour vs Tooltip vs Steps.
- [Steps](../../steps-usage/references/ux.md): real step-by-step tasks.
