<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/dialog--2774-29317.md, drawer-side--2774-29341.md, drawer-edge--2774-29633.md, edited. Storybook: Molecules/Dialog → UX guidelines. -->

# Dialog: UX guidelines

A Dialog opens a named task or decision on a layer above the page. The user
finishes it with a named action or cancels it, and then knows where to
continue and whether their changes were kept.

## When to use

- A focused task or decision that must be finished or cancelled before
  continuing.
- An irreversible confirmation, with `role="alertdialog"`.
- Creating, reading or editing a record over its list, with
  `placement="right"` (the drawer in the CRUD pattern).

## Use something else when

| Need | Use instead |
| --- | --- |
| A message that doesn't block the user | `Toast` or inline `StatusText` |
| Small content anchored to its trigger (filters, a mini form) | `Popover` |
| A hint on hover or focus | `Tooltip` |
| Persistent navigation, or a transient edge panel such as a cart | `Sidebar` / `Drawer` |
| A long record with several sections | a full page (record editor) |

## Anatomy

- **Title**: names the task or record.
- **Description** (optional): one or two sentences about consequences.
- **Content**: the working area (form, details).
- **Actions** (`actions` slot): the footer, `[Cancel] [Primary]`, bottom-right.
- **Close button**: always reachable; hidden only with `hideCloseButton` when
  another visible way out exists.
- **Backdrop**: only in modal behaviour.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `behavior=modal` | `behavior="modal"` (default) | Focus is trapped inside and the page behind can't be used. |
| — | `behavior="modeless"` (or `modal={false}`) | The page stays usable; focus isn't trapped. Use it only when working beside the dialog is the point (for example comparing values), and pass `closeOnInteractOutside={false}`: it defaults to `true`, so a click on the page behind would close the dialog. |
| — | `placement="center"` (default) | A task or decision. |
| — | `placement="right"` / `"left"` / `"top"` / `"bottom"` | An edge panel. `right` is the standard drawer for record create, read and edit. |
| — | `size="xs" … "full"` | Fit the content: `sm` for confirmations, `md` for forms. |
| — | `role="alertdialog"` | An irreversible or high-cost decision. |

The design file currently shows only `behavior=modal`; placement, size and
modeless exist in code and are the API to use.

## Behaviour

**May:** open a task, run a named action, or cancel it.

**Must not:** appear for every non-blocking message; treat closing as
confirming; open another dialog on top of itself (replace the content or use
steps inside one dialog instead).

- The trigger opens the layer and moves focus into its task (the kit does
  this). In a destructive confirmation, focus `Cancel` first with
  `initialFocusEl`.
- Confirming is its own named action. A failure keeps the data and shows the
  explanation inside the dialog.
- Cancel or close never confirms changes. A dirty form asks first
  (`Discard unsaved changes?`), see
  [States → Dirty](../../ux-guidelines/references/states.md).
- On close, a modal dialog returns focus to the trigger. If the trigger no
  longer exists (the record was deleted), send focus to the next logical
  element with `finalFocusEl`. Both depend on the focus trap, so a modeless
  dialog (`trapFocus` defaults to `false`) restores nothing: move focus back
  yourself in `onOpenChange` when it closes.
- Modal behaviour limits work behind the dialog; modeless must not block it
  without a reason.

## Content and copy

- Title = the task or record: `New product`, `Edit product` — cs: `Nový produkt`, `Upravit produkt`.
- A destructive title is a question: `Delete this product?` — cs: `Smazat tento produkt?`. The description names the record and the consequence.
- In an alertdialog the destructive button replaces the primary and repeats
  the verb + object (`Delete product`). Never `Yes` / `No`.
- Neutral Cancel is `severity="tertiary" appearance="outline"`; `severity="danger"`
  is only for the destructive action.

## Accessibility

- The kit traps focus in modal behaviour, closes on Escape and, in modal behaviour, restores focus.
  Don't override this.
- The close button and `Cancel` stay visible; never put the only way out
  inside scrolled content.
- On small screens and with long content, the actions and the end of the task
  stay reachable.

## Edge cases

- **Save rejected inside a drawer**: keep the drawer open with the draft and
  the error on the field; don't close it and toast an error.
- **Record deleted from its own detail drawer**: close the drawer, toast
  `<Object> deleted`, and move focus to the next row, not the page body.
- **Escape with unsaved changes**: ask before discarding, exactly as for the
  close button.

## Related

- [Feedback and actions](../../ux-guidelines/references/feedback-and-actions.md): CRUD surfaces, destructive actions.
- [Value lifecycle](../../ux-guidelines/references/value-lifecycle.md): closing is not confirming.
- [Button](../../button-usage/references/ux.md): footer labels and loading.
