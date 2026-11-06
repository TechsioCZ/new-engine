<!-- Source: TechsioCZ/UX_docs@167b618f1 (UX_Description_var_02_Simplified), rules shared by button, input, select, quantityfield, searchform, slider, steps, table-cell and datatable docs; edited. Storybook: UX/Value lifecycle. -->

# Value lifecycle: draft, pending, confirmed

Every value a user changes passes through the same stages. Most UX bugs come
from showing one stage as another: a value that looks saved but isn't, a hover
that changes data, or an old server response that overwrites a newer choice.

| Stage | Meaning | What the user sees |
| --- | --- | --- |
| **Draft** | The user is typing, dragging or browsing options. Nothing is committed. | The control's own value; no success message |
| **Pending** | A commit was started and the app is waiting for the result. | `isLoading` on the button that started it, or the component's pending state |
| **Confirmed** | The app or server accepted the value. | The new value on the object, plus a toast when the UI barely changes |
| **Rejected** | The commit failed. | The draft is still there, with an error that says what to fix |

## Rules

### Interaction never commits by itself

- Hover, focus, opening a list and moving through options are **browsing**,
  not choosing. Only an explicit action commits: selecting an option, pressing
  Enter, clicking Save.
- Moving focus away from an edited table cell must never commit another row's
  edit.
- Visiting a step is not completing it. A step becomes complete only once its
  own validation has passed.

### Validate at a defined moment

- Typing changes the draft, not the record. Validate on blur or submit, never
  on page load for fields the user hasn't touched
  ([States → Validation and errors](states.md)).
- Visual error, success and warning states are presentation. The rule that
  decides them lives in the app or form, not in the colour of the control.
- `success` on a field means *this value was checked*, not *the form was saved*.

### Pending is only for real waiting

- Show loading only for real asynchronous work that starts after local
  validation passed. A synchronous action never shows a spinner.
- While pending, block a repeated commit of the same action (Button
  `isLoading` does this) but keep the rest of the screen readable.

### Failure keeps the draft

- A rejected value stays in the field, ready to fix, with the message on that
  field. Never clear what the user typed because the server said no.
- There is no "error" button. Report the failure on the form, field or object
  it belongs to.
- A failed sort, filter or page change shows the previous state again. Don't
  leave the new sort arrow on a table whose data didn't change.

### Cancel restores the last confirmed value

- Cancelling an edit (Escape in a cell, Cancel in a drawer, Cancel on a
  drafted filter panel) restores the last **confirmed** value, not an empty one.
- Closing a dialog is not confirming it. Whether closing keeps or discards a
  draft must be decided per flow, and a dirty form asks first
  ([States → Dirty](states.md)).

### Newer intent wins

- Tie every async response to the request that caused it. An older response
  must never overwrite a newer one: search results for `drill` must not
  replace results for `drill bits`, and an old quantity update must not undo
  the latest quantity.
- Discard out-of-order responses instead of rendering them.

### Clearing is not deleting

- Clearing a field (the × in Select, Combobox, SearchForm) clears the value.
  It never deletes the record, and on a required field it leaves a *missing*
  value that validation reports, not a valid "empty" choice.
- Clearing a search input doesn't by itself reset results already shown. Each
  search decides and documents whether it does.
- A previously saved value that is no longer available (an archived category,
  a withdrawn shipping method) is shown as unavailable with the fix. Don't
  silently drop or replace it.

## Where the kit helps

| Need | Kit support |
| --- | --- |
| Pending button | Button `isLoading` + `loadingText` |
| Pending quantity | QuantityField `pendingLabel` |
| Pending table | DataTable `loading` (first load) and `loadingMore`; rows stay while refreshing |
| Field errors | Form fields `validateStatus` + `helpText` |
| Dirty forms | Badge `Unsaved changes` + `alertdialog` on leave |

The app still owns request ordering, rollback and the decision to keep or
discard drafts.
