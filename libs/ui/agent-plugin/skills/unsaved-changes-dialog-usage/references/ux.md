<!-- Source: written from libs/ui code and the usage skill (no UX_docs counterpart). Storybook: Molecules/UnsavedChangesDialog → UX guidelines. -->

# UnsavedChangesDialog: UX guidelines

Use UnsavedChangesDialog when the user is about to leave a form with unsaved changes. The app decides when to ask and what each answer does.

## When to use

- Closing a SidePanel with an edited form (from `onCloseRequest`).
- Navigating away or switching record while a draft is unsaved.

## Use something else when

| Need | Use instead |
| --- | --- |
| Confirming a destructive action | Dialog with role="alertdialog" |
| Telling the user a save failed | SaveBar status |

## Anatomy

- **Title** and **description**.
- **Stay** (outline), **Discard changes** (outline danger), **Save** (primary, loading while saving).

## Behaviour

**Do:**

- Leave only after Save succeeded or after Discard changes.
- Keep the form open on Stay, Escape or a press outside.

**Don't:**

- Ask when nothing is unsaved.
- Save without the user choosing Save.

## Content and copy

- All words come from the catalog (`unsavedChanges`).

## Accessibility

- `role="alertdialog"`; Escape and a press outside mean Stay.
