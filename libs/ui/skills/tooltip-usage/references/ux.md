<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/tooltip--2774-19620.md (+ tooltip-md-default-right-start--3963-24067.md), edited. Storybook: Atoms/Tooltip → UX guidelines. -->

# Tooltip: UX guidelines

A Tooltip shows a short, optional hint about one control on hover and focus.
The task must be understandable without it.

## When to use

- Short, non-essential hints: the name of an icon-only action, the full text
  of a truncated cell, a keyboard shortcut.

## Use something else when

| Need | Use instead |
| --- | --- |
| Required information, an instruction or a format the user must follow | visible help text next to the field |
| Interactive content (links, buttons, a form) | `Popover` |
| An error | inline `StatusText` / the field error |
| Explaining why a button is disabled | text next to the control |

## Anatomy

- **Trigger**: a named, focusable element (the child). The hint never
  replaces its name.
- **Bubble**: `content`, a few words, with an arrow pointing at the trigger.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` (default `md`) | Text size and padding only. |
| `variant=default` | `appearance="solid"` | Filled bubble. |
| `variant=outline` | `appearance="outline"` | Bubble with a border. Same meaning. |
| `placement=top` … `left` | `placement` | Preferred side. The kit flips it when there's no room. |
| — (right-start, right-end, left-start, left-end) | `placement` | Any placement works in code, though Figma shows only some of them. |
| `Tooltip/md/default/right-start` | `size="md" appearance="solid" placement="right-start"` | A reference frame, not a separate component. |

## Behaviour

**May:** show its hint on hover and on keyboard focus of the same trigger;
stay open while the pointer moves onto the bubble; close on Escape.

**Must not:** hold the only name of an action, a required instruction or the
only copy of an error; contain links, buttons or a form; run any action.

- The kit opens after a short delay (200 ms) and keeps the bubble open while
  the pointer travels onto it (`interactive`), so it's readable.
- Escape closes the hint without moving focus, and without closing a dialog
  around it.
- A disabled button gets no hover or focus, so a tooltip on it never shows.
  Put the reason next to the control.
- On touch screens there is no hover. The task must still make sense without
  the hint.

## Content and copy

- A few words, sentence case, no trailing period for a fragment:
  `Search products` — cs: `Hledat produkty`.
- For an `ActionIcon`, repeat its `aria-label`.
- Explain the thing itself (`Amount held until the order ships`), not that
  an explanation exists.

## Accessibility

- The kit links the bubble to the trigger with `aria-describedby`; a screen
  reader reads it as a description, not as the name.
- The trigger must be focusable so keyboard users get the hint too.
- The bubble never takes focus.

## Edge cases

- **A field needs an explanation to be filled in** (unusual number format):
  show it permanently under the field, not only in a tooltip.
- **The bubble covers content the user needs**: Escape closes it without
  losing focus.

## Related

- [Accessibility](../../ux-guidelines/references/accessibility.md): names, focus, hover-only content.
- [States](../../ux-guidelines/references/states.md): explaining disabled controls.
- [Popover](../../popover-usage/references/ux.md): interactive anchored content.
