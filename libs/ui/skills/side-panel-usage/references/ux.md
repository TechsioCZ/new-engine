<!-- Source: written from libs/ui code and the usage skill (no UX_docs counterpart). Storybook: Molecules/SidePanel → UX guidelines. -->

# SidePanel: UX guidelines

Use SidePanel for a create, edit or quick-view form next to a list. It is Dialog's right placement plus resizing, a close guard and draft keeping.

## When to use

- Editing or creating a record without leaving the list.
- A non-blocking quick view of a record (`peek`).

## Use something else when

| Need | Use instead |
| --- | --- |
| A short confirmation | Dialog |
| A bottom sheet on touch | Drawer |
| A long multi-section editor | a full page |

## Anatomy

- **Title**, **description**, **close button**.
- **Resize handle** on the left edge (drag, arrows, Home resets).
- **Body** (`children`), scrolling.
- **Actions** (`actions`), pinned at the bottom.

## Behaviour

**Do:**

- Route every close through `onCloseRequest` when the form can hold unsaved changes.
- Put the form's SaveBar last in `actions`.
- Use the same `widthStorageKey` for panels that should share a width.

**Don't:**

- Nest a SidePanel in a SidePanel.
- Draw frames inside it; SectionCards inside it are flattened.

## Content and copy

- Title: the action and the object (`Edit customer`, `New invoice`).

## Accessibility

- A modal dialog with a focus trap (non-modal with `peek`).
- The resize handle is a button with keyboard instructions in its name.
- Escape closes it unless a popup above it (listbox, calendar, menu, dialog) is open.
