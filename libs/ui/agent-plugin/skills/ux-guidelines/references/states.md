# Interaction states

Every interactive component has the same state vocabulary. Style comes from
tokens via data attributes (`data-disabled`, `data-[validation=error]`, …) —
apps never restyle states with `className`.

## Disabled

Disabled means **"exists, but cannot be used right now"**. Disabled controls are
skipped by keyboard focus and many screen readers, and cannot show a tooltip on
hover, so the reason must not live only in the control.

Use `disabled` when:

- the reason is **obvious from the screen**: `Save` on a record editor while
  nothing has changed (paired with the absence of the `Unsaved changes` badge);
  `Back` on the first step; pagination `Previous` on page 1;
- the reason is **shown next to the control**: help text such as
  `Add a title to publish.` or a StatusText under the button group;
- an action is **in progress** — prefer `isLoading` on the button that
  started it, which also blocks repeat submits.

Do **not** disable:

- a form's submit button just because fields are invalid *and* the user can't
  see why — keep it enabled and on submit show inline errors plus
  `FormErrorSummary`. (Disabling is fine when every required field is visibly
  marked and the form is short — the CRUD reference drawer does this.)
- to hide permission problems — hide actions the user can never perform, or
  show them disabled with the reason (`Only owners can delete a workspace.`).
- whole sections for loading — use Skeleton.

Visual: the kit's disabled tokens (reduced contrast, `cursor-not-allowed`).
Never fake disabled with `opacity-50` or `pointer-events-none` classes.

## Read-only vs disabled

| | Read-only | Disabled |
| --- | --- | --- |
| Meaning | You may see and copy this, but not change it | Not available right now |
| Focusable / selectable | Yes | No |
| Submitted with the form | Yes | No |
| Use for | Computed values, locked records, fields you lack permission to edit, IDs | Options that depend on another choice, in-progress actions |

A record the user can view but not edit is shown as text (`DetailList`) or
read-only inputs — not a form full of greyed-out fields.

## Loading

| Wait | Feedback |
| --- | --- |
| < 300 ms | nothing (avoid flashing indicators) |
| Button action | `isLoading` + `loadingText` (`Saving…`) on that button; the rest of the form stays readable |
| Section/page content | `Skeleton` mirroring the final layout (same rows, columns, heights) |
| Long background job (> 10 s) | toast of type `loading` updated to success/error, or a progress row in the list |
| Table refresh with data already shown | keep the rows, show progress in the toolbar; don't blank the table |

- Never replace a whole page with a centred spinner when the layout is known.
- Keep layout stable: reserve space for async content (no jump when it arrives).
- Respect `prefers-reduced-motion` — the kit's transitions already do.

## Validation and errors

- Validate on **blur** or **submit**, not on every keystroke of the first
  entry; once a field shows an error, re-validate on change so it clears as
  soon as it is fixed.
- The error goes **on the field** (`validateStatus="error"` + message in
  `helpText`), connected for assistive tech by the Form* components.
- After a failed submit with **two or more** errors, show `FormErrorSummary`
  above the form, focus it, and link each item to its field. With one error,
  focus that field.
- Server errors that belong to a field (duplicate SKU) are mapped onto that
  field; errors that don't are shown in the summary or an inline StatusText
  above the form actions.
- Colour is never the only signal: the kit pairs error colour with an icon and
  text — don't strip either.

## Empty

Every list, table, chart and search result has three designed empty states:

1. **First use** — explains the object and offers the create action.
2. **No results** — names the query/filter and offers `Clear filters`.
3. **Error** — says loading failed and offers `Try again`.

DataTable shows one empty state at a time: choose the copy from the app's state
(`translations.emptyTitle` / `emptyDescription`) or render per-case content with
`renderEmpty` so a load error never reads as `No records`. Charts show an empty
state instead of empty axes.

## Selected, active, current

- The current location is marked in navigation (`aria-current="page"` via
  VerticalNavigation/Breadcrumb/Tabs) — never only by colour.
- Selected rows show a count and the bulk actions that apply; bulk actions
  appear only while a selection exists so the toolbar doesn't reflow.

## Dirty (unsaved changes)

- Show that the page is dirty (`Badge` `Unsaved changes` next to the title) and
  enable `Save` only then.
- Leaving a dirty form (route change, closing a drawer) asks in an
  `alertdialog`: `Discard unsaved changes?` → `[Keep editing] [Discard changes]`.
- Don't ask when nothing changed.

## Focus

- Opening a dialog/drawer moves focus into it; closing returns focus to the
  trigger (the kit's Zag machines do this — don't override).
- After create/delete in a list, keep focus on a sensible neighbour (the new row,
  or the row after the deleted one), not the document body.
- Never remove focus rings; the kit's `focus-visible` tokens are the ring.
