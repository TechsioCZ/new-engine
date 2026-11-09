<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/action-icon--2774-39583.md, edited. Storybook: Atoms/ActionIcon → UX guidelines. -->

# ActionIcon: UX guidelines

ActionIcon is a compact, icon-only button for one repeated action whose symbol
users recognise: close, clear, edit, delete, copy, more. The name lives in
`aria-label`, not in the glyph.

## When to use

- A universally understood icon names the action, and the action repeats many
  times on screen: row actions, toolbars, card corners, input adornments.
- The sub-buttons inside larger controls (clear ✕, close ✕, previous and
  next). Select, Combobox, Dialog, Drawer, Toast, Carousel and others already
  render theirs with ActionIcon.

## Use something else when

| Need | Use instead |
| --- | --- |
| The main action of the surface, or an icon that isn't obvious | `Button` with `icon` and a text label |
| Go to another page | `Link` or `LinkButton` |
| Several actions on one row | one ActionIcon (`More actions`) that opens a `Menu` |
| A decorative icon next to text | `Icon` |

## Anatomy

- **Glyph**: any `icon` (`token-icon-*` or `icon-[…]`), rendered at the size of
  the hit area. The glyph is decorative; it is never the name.
- **Name**: `aria-label` or `aria-labelledby`. The type requires one.
- **Hit area and pill**: shared icon-control tokens, so every icon button in the
  system has the same size and hover treatment.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| fixed close (✕) glyph | `icon` (any glyph) | Figma has one fixed ✕. In code the glyph is a prop; pick the one that matches the action. |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` | Density only. Default `md`; prefer `lg` for standalone touch actions. `sm` never shrinks the target below what the task needs. |
| `tone=neutral` | `tone="neutral"` | An ordinary action with no destructive result. |
| `tone=danger` | `tone="danger"` | A destructive action. Put it last in the group; it still confirms or offers Undo. |
| `state=hover` | not a prop | Highlight only. It never confirms or runs anything. |
| — | `disabled` | Can't be used right now. Removed from the tab order, so explain why elsewhere. |

There is no loading state. Show progress on the row or surface the action changes.
The design file's `Table.IconButton` is this component.

## Behaviour

**May:** run the one action its name promises on the object next to it.

**Must not:** save, approve or submit a form; act as navigation.

- A close (✕) ActionIcon only closes the named layer or preview. Unsaved
  changes and focus return belong to the host (Dialog, Drawer, panel): the host
  decides whether to keep or explicitly discard the draft. The ✕ itself never
  saves and never deletes.
- A clear (✕) inside a field clears the value or the query, never the record
  behind it.
- Delete uses `tone="danger"` and a trash glyph, and goes through a confirmation
  or an Undo toast ([Feedback and actions](../../ux-guidelines/references/feedback-and-actions.md)).
- Two neighbouring ActionIcons never share a glyph for different actions.

## Content and copy

- `aria-label` is verb + object, named by the result: `Close supplier detail`,
  `Delete product`, `Copy link` — cs: `Zavřít detail dodavatele D-208`,
  `Smazat produkt`, `Kopírovat odkaz`. Never the glyph name (`Cross`, `X`).
- A Tooltip with the same text helps pointer users. It supplements the name,
  it never replaces it.

## Accessibility

- The kit renders a real `<button type="button">` with keyboard activation and
  a visible focus ring; the glyph is `aria-hidden`.
- The name must make sense read alone. Repeated row actions include the object
  (`Delete order 1024`) when several are on screen.
- Tooltips don't show on disabled controls, so a disabled ActionIcon needs its
  reason in visible text nearby.
- Meaning never depends on colour alone: `danger` keeps its destructive glyph
  and name.

## Edge cases

- **Closing a detail with unsaved edits**: the ✕ asks the host to resolve the
  draft (keep editing or discard); it never saves silently.
- **Icon not recognised in user testing**: switch to a `Button` with a text
  label rather than adding a tooltip to explain it.

## Related

- [Accessibility](../../ux-guidelines/references/accessibility.md): naming icon-only controls.
- [UX writing](../../ux-guidelines/references/ux-writing.md): action labels.
- [Button](../../button-usage/references/ux.md): when the action needs a text label.
- [Icon](../../icon-usage/references/ux.md): which glyph means what.
