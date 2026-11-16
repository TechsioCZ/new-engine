<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/popover--2774-30598.md (+ popover-content--2774-30830.md, popover-placement--2774-30906.md), edited. Storybook: Molecules/Popover → UX guidelines. -->

# Popover: UX guidelines

A Popover opens short, local content next to the control that opened it. The
user reads it or does a small task, then closes it and continues where they
were.

## When to use

- Small interactive content anchored to a trigger: a filter panel, a colour
  picker, quick edit of one value, share options.
- Supplementary content the user asks for and may interact with.

## Use something else when

| Need | Use instead |
| --- | --- |
| A short, non-interactive hint on hover or focus | `Tooltip` |
| A decision that must block the page | `Dialog` |
| Creating or editing a record, or any larger form | `Dialog` (`placement="right"` for records) |
| A list of commands | `Menu` |
| A long or multi-screen task | a full page |

## Anatomy

- **Trigger**: names what opens (`Filters`, `Share`).
- **Content**: `Popover.Title`, optional `Popover.Description`, the body, and
  `Popover.CloseTrigger`.
- **Arrow** (optional): `Popover.Arrow`, only when it helps show which control
  the panel belongs to.

The title, description, body and close all belong to the same local task.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` | Density and width only. |
| `border=true` / `false` | `border` | Without a border, the layer edge must stay recognisable (shadow, contrast). |
| `shadow=true` / `false` | `shadow` | Visual separation only; no change of meaning. |
| `showArrow` | `<Popover.Arrow />` | Show it when the link to the trigger isn't obvious. |
| `modal` | `modal` | Blocks the page behind; use only when the popover's task really must finish first. |
| Content `showTitle`, `showDescription`, `showCloseButton` | the `Title`, `Description`, `CloseTrigger` parts | Leave a part out only if its job is done another way (see Behaviour). |
| Popover/Placement `placement=top` … `left-end` | `placement` (default `bottom`) | Preferred side. The kit flips it on collision (`flip`, on by default). |

Popover/Placement is a reference set in Figma, not a separate component.

## Behaviour

**May:** open related local content and run its named actions.

**Must not:** behave like a Tooltip that disappears before a required step is
done; open on hover; hide a whole page process in a small overlay.

- The trigger opens the panel and the kit moves focus into it. Escape and an
  outside click close it, and focus returns to the trigger.
- Applying is its own named action (`Apply`) or happens instantly, never both.
  Closing never saves a half-made change; an outside click doesn't silently
  apply an edited filter.
- Without a visible title, give `Popover.Content` an `aria-label`. Without a
  close button, Escape and outside click must still close it.
- A filter popover ends with `[Reset] [Apply]`, bottom-right
  ([Feedback and actions](../../ux-guidelines/references/feedback-and-actions.md)).

## Content and copy

- Trigger text says what opens; show active filters in it: `Filters (2)` —
  cs: `Filtry (2)`.
- Keep content short. If it scrolls, it should be a Dialog.
- Never put required information only in a popover.

## Accessibility

- The kit names the panel from `Popover.Title` and `Popover.Description` and
  handles focus in and out.
- Interactive content works without a mouse; links inside are never reachable
  only by hover.

## Edge cases

- **Filters closed by an outside click**: the unapplied draft is discarded,
  not applied; the trigger count still shows the applied filters.
- **The choice grows** (many options, several screens): move it to a Dialog or
  a page.

## Related

- [Feedback and actions](../../ux-guidelines/references/feedback-and-actions.md): `[Reset] [Apply]`.
- [Value lifecycle](../../ux-guidelines/references/value-lifecycle.md): closing is not confirming.
- [Tooltip](../../tooltip-usage/references/ux.md): non-interactive hints.
- [Dialog](../../dialog-usage/references/ux.md): blocking tasks and forms.
