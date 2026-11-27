<!-- Source: written from libs/ui code and the usage skill (no UX_docs counterpart). Storybook: Molecules/SaveBar → UX guidelines. -->

# SaveBar: UX guidelines

Use SaveBar as the one save control of an edit form. One click sends one save; nothing else in the form saves.

## When to use

- Any form that edits an existing record with explicit save.
- The footer of a SidePanel edit form (last in `actions`).

## Use something else when

| Need | Use instead |
| --- | --- |
| Confirming leaving with unsaved changes | UnsavedChangesDialog |
| A one-shot create dialog | Dialog with a primary Button |

## Anatomy

- **Status** (polite live region): unsaved, saved, invalid, sent for approval, error, conflict, new release.
- **Secondary action**: Load the latest version (conflict) or Reload and restore (new release).
- **Save** (primary Button, loading while saving).

## Behaviour

**Do:**

- Drive `status` from the form's draft state.
- Pass `onReloadLatest` so a conflict can be resolved.
- Pass the server's reason as `error` when there is one.

**Don't:**

- Save on blur, on a timer or on unmount.
- Add a second Save button to the same form.

## Content and copy

- All words come from the catalog (`saveBar`); `error` overrides the failure text only.

## Accessibility

- Status changes are announced politely; the button keeps its name while loading (`loadingText`).
- The root carries `data-save-state` so SidePanel knows whether a draft is settled.
