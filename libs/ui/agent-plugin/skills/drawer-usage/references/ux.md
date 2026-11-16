<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/drawer-side--3032-297.md, drawer-sheet--3039-604.md and part docs (drawer-header, -title, -description, -body, -footer, -grabber, -grabberindicator, -defaultbody, drawersnapbody, draweraccountbody), edited. Storybook: Molecules/Drawer → UX guidelines. -->

# Drawer: UX guidelines

A Drawer is a transient panel that slides in from an edge of the viewport. It
keeps the page behind it visible, so the user does a side task without losing
their place.

## When to use

- A transient edge panel tied to the current page: cart, mobile filters,
  mobile navigation, a quick view.
- Content that relates to the page behind it and should keep that context.

## Use something else when

| Need | Use instead |
| --- | --- |
| Create, read or edit a record over a list (admin CRUD) | `Dialog placement="right"`, the canonical CRUD drawer |
| A focused, blocking decision | `Dialog` |
| Persistent app navigation | `Sidebar` (its mobile mode already renders a Drawer) |
| Small content anchored to a trigger | `Popover` |
| A long or multi-step process | a full page with `Steps` |

Dialog `placement` is not a legacy API. For record CRUD it is the house
pattern; Drawer is for the other edge panels above.

## Anatomy

- **Header**: `Drawer.Title` names the panel's task; `Drawer.Description`
  (optional) explains context or consequence the title can't.
- **Body**: the working content. It owns scrolling, so long content never
  pushes the footer or close out of reach.
- **Footer**: the closing actions of this task only, `[Cancel] [Primary]`,
  bottom-right. A `Drawer.CloseTrigger` with text renders a Button; without
  children it renders an icon close button.
- **Grabber** + **GrabberIndicator** (optional): the drag handle for
  `snapPoints` sheets. The indicator is a visual mark only; the Grabber is the
  drag area. Its orientation follows `placement`.
- **Backdrop**: only for modal use.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `Drawer.Side` set, `placement=start` / `end` | `placement="start" \| "end"` (default `end`) | Side panel. Logical edges: they mirror in RTL. Navigation from `start`; cart, filters, details from `end`. |
| `Drawer.Sheet` set, `placement=top` / `bottom` | `placement="top" \| "bottom"` | Sheet from the top or bottom edge, usually on mobile. |
| `size=xs` … `xl` | `size="xs" \| "sm" \| "md" \| "lg" \| "xl"` | Width (side) or height (sheet) only. A larger size doesn't change meaning. |
| `size=full` | `size="full"` | The whole width (side) or height (sheet). Close and actions stay reachable. |
| `dir=ltr` / `rtl` | `dir` | Reverses the logical layout, never the meaning of actions. |
| `open` | `open` / `defaultOpen` | Controlled or initial open state. |
| `backdrop` | `<Drawer.Backdrop />` | Present for modal use; omit it for a non-modal panel. |
| `showHeader`, `showFooter`, `showGrabber` | the parts above | Without a header, give `Drawer.Content` an `aria-label`. |
| Grabber `orientation` | not a prop | Derived from `placement`. |
| — | `snapPoints`, `defaultSnapPoint` | Resting heights for a draggable sheet. |
| — | `modal={false}` + `trapFocus={false}` + `preventScroll={false}` | Non-modal panel; the page stays usable. |

`Drawer.Side` and `Drawer.Sheet` are Figma set names, not code parts. Code has
one `Drawer` with `placement`.

## Behaviour

**May:** open related detail or a form, let the user work in it, and close it
in a defined way; resize or snap by drag when the panel offers it.

**Must not:** treat moving, snapping or closing the panel as saving; make a
drag gesture the only way to a result; stack drawers.

- The trigger opens the panel and the kit moves focus into it. On close, focus
  returns to the trigger (or `finalFocusEl`), and the page scroll is kept.
- Confirming is its own named footer action. A failure keeps the data and the
  explanation in the panel.
- Closing with unsaved changes asks first, as in a dialog
  ([States → Dirty](../../ux-guidelines/references/states.md)). Closing never
  looks like a successful save.
- Every drag outcome (snap, dismiss) has a non-drag equivalent: a close
  button, a footer action, Escape.
- A lower snap point doesn't shrink the content. The footer actions and close
  must stay reachable at the lowest snap point.
- Modal use blocks the page and keeps focus inside; a non-modal panel must not
  block the page without a reason.

## Content and copy

- The title names the content or task: `Cart (3)`, `Filters` — cs:
  `Košík (3)`, `Filtry`. Title, body and footer actions belong to the same task.
- Filter drawers end with `[Reset] [Show 24 results]` — cs:
  `[Obnovit] [Zobrazit 24 výsledků]`.
- Confirm and cancel have different names and consequences. `Close` only when
  there is nothing to lose.
- The close icon means "close this panel"; it never confirms or undoes
  anything.

## Accessibility

- The kit names the panel from `Drawer.Title` and `Drawer.Description`, traps
  focus in modal use, closes on Escape and restores focus.
- On small screens and with long content, the end of the task and the close
  stay reachable.
- Footer actions wrap on narrow screens instead of truncating their labels.

## Edge cases

- **Mobile filters at a low snap point**: `Show results` and close are still
  reachable without dragging the sheet up.
- **Closing a changed cart quantity form**: nothing was saved, so nothing says
  it was.
- **Mobile navigation**: use `Sidebar`'s mobile mode; don't wrap Sidebar in
  another Drawer or add Body padding around it.

## Related

- [Dialog](../../dialog-usage/references/ux.md): the CRUD drawer and blocking decisions.
- [Feedback and actions](../../ux-guidelines/references/feedback-and-actions.md): footer order, CRUD surfaces.
- [States](../../ux-guidelines/references/states.md): dirty forms, focus on open and close.
- [Component selection](../../ux-guidelines/references/component-selection.md): Drawer vs Dialog vs Sidebar.
