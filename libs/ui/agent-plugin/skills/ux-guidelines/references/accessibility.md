<!-- Source: TechsioCZ/UX_docs@167b618f1 (UX_Description_var_02_Simplified), "Přístupnost a prostředí" sections across all component docs; edited. Storybook: UX/Accessibility. -->

# Accessibility

The kit's components handle roles, focus management, keyboard support and
ARIA wiring. These rules cover what the app still decides: names, copy,
layout and which component it picks.

## Names

- Every control has a lasting accessible name. A placeholder is not a name.
- Icon-only controls use `ActionIcon` with an `aria-label` that names the
  action and its object: `Remove Aku vrtačka V18`, not `Trash` or `Icon`.
- A design-token or icon name (`token-icon-trash`) is never a user-facing label.
- Repeated controls (a Delete per row) name their row, so a screen reader list
  of buttons still makes sense.

## Focus, selection and hover are different things

- Focus is where the keyboard is. Selected is the chosen value. Hover is where
  the pointer is. Each needs its own visual state, and none of them commits a
  value ([Value lifecycle](value-lifecycle.md)).
- Opening a dialog or drawer moves focus into it; closing returns focus to the
  trigger, or to the next logical element if the trigger is gone (for example
  after deleting the row that opened it).
- Never remove focus rings.

## Keyboard and pointer parity

- Everything a pointer can do, the keyboard can do. Nothing is hover-only: a
  truncated value that matters for a decision is fully readable on focus or in
  a detail view, not only in a tooltip.
- Drag is never the only way. Reordering, range selection and swiping all have
  keyboard or button alternatives.
- Links or buttons inside table cells don't turn a table into a grid. Keep the
  normal tab order and don't add `role="grid"` or arrow-key cell navigation
  unless the whole widget implements that pattern.

## Meaning without colour

- Status, validation and danger are never shown by colour alone. The kit pairs
  them with an icon and text; don't strip either.
- An outline or border is never the only sign that something is interactive.

## Size, density and language

- Smaller sizes (`sm`) are for dense layouts, not for hiding controls. They
  never remove the only way to finish a task.
- Long labels, long units and translations must not overlap values or
  controls. Test with long Czech and German strings.
- On small screens and long content, the main actions and the end of the task
  stay reachable.

## Announcing changes

- Pending work is announced: Button `isLoading` sets `aria-busy`; toasts
  announce results.
- Errors are linked to their field (`aria-describedby`, `aria-invalid`), which
  the kit's form fields do for you when you pass `validateStatus` and
  `helpText`.
- Progress text such as `Step 2 of 4` or `Slide 2 of 5` exists for assistive
  tech, not only as dots or a bar.
