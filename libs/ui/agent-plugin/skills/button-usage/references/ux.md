<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/button--2774-3555.md, edited. Storybook: Atoms/Button → UX guidelines. -->

# Button: UX guidelines

A Button runs a clearly named action on the current page and leads the user to
a result they can recognise.

## When to use

- The user deliberately runs a command, confirms input or changes data: save,
  create, delete, open a dialog, apply filters.
- Form submission and dialog or drawer footers.
- Page-level commands in the page header (`New product`).

Before activating it, the user must know what it affects and what will happen.

## Use something else when

| Need | Use instead |
| --- | --- |
| Go to another page, styled as a button | `LinkButton` |
| Inline navigation in text | `Link` |
| Compact repeated icon action | `ActionIcon` |
| More than three related commands | `Menu` behind one Button |
| Turn a setting on or off | `Switch` |

## Anatomy

- **Label**: the action text. Always present, even when there is an icon.
- **Icon** (optional): `icon` + `iconPosition`, only when it speeds up
  recognition (`+` for New, trash for Delete).
- **Loading indicator**: replaces the content while `isLoading`, together with
  `loadingText`.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `variant=primary` | `variant="primary"` | The main next step of the current task. One per surface. |
| `variant=secondary` | `variant="secondary"` | A supporting action that must stay clearly available. |
| `variant=tertiary` | `variant="tertiary"` | A quieter related action, such as a neutral Cancel. Keep its name readable. |
| `variant=warning` | `variant="warning"` | Risky but not destructive; the label explains the consequence. |
| `variant=danger` | `variant="danger"` | Destructive or otherwise serious; the label names the object and the result. |
| `theme=solid` | `theme="solid"` | Strongest emphasis. |
| `theme=light` | `theme="light"` | Softer filled surface; still clearly a control. |
| `theme=outlined` | `theme="outlined"` | Boundary without a solid fill; the border is never the only sign it's interactive. |
| `theme=borderless` | `theme="borderless"` | Quiet, integrated action (what other kits call "ghost"). The context must still show it's a control. |
| — | `theme="unstyled"` | Only inside another component's surface. |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` | Density only. A larger size doesn't change meaning, permission or state. `sm` never shrinks the target below what the task needs. |
| `state=hover`, `focus`, `active` | not props | Produced by the browser. Hover never commits anything; focus is not a chosen value. |
| `state=disabled` | `disabled` | Can't be used right now, for a reason the user can find. |
| `state=loading` | `isLoading` + `loadingText` | A started, unfinished operation. Blocks a repeat; keeps focus and tab stop. |

There is no `variant="ghost"` and no error Button.

## Behaviour

**May:** submit a form, confirm a decision or run an available operation.
Before an irreversible step, make clear what it affects and what follows.

**Must not:** change data on focus or hover; act as a hidden page navigation
(use `LinkButton`).

How a press moves through the [value lifecycle](../../ux-guidelines/references/value-lifecycle.md):

1. Activation first checks the command's own conditions (local validation).
2. Only real asynchronous work then sets `isLoading`. A synchronous action
   never shows loading.
3. While pending, repeated activation is blocked. The app also guards the
   request itself.
4. The result is reported by the form or object it changed, and the button
   returns to available or, for a real reason, disabled.
5. A failure keeps the user's draft and reports the problem on the form or
   object. The button never turns into an "error" button and never changes its
   label to the result (`Saved!`); confirm with a toast instead.

## Content and copy

- Verb + object, sentence case, naming the result: `Save changes`,
  `Create product`, `Delete product` — cs: `Uložit změny`, `Přidat do košíku`,
  `Odebrat přístup`.
- Never `OK`, `Yes`, `Submit`, `Confirm` or `Click here` when they don't say
  what happens.
- For a serious action the object is part of the label or the surrounding
  dialog (`Delete product` in an alertdialog naming the product).
- `Cancel` leaves without saving; `Close` closes something with no pending
  changes.
- A disabled button needs its reason nearby when the screen doesn't make it
  obvious.

Full label table: [UX writing](../../ux-guidelines/references/ux-writing.md).

## Accessibility

- The kit handles keyboard activation, `aria-busy` while loading, and keeping
  focus during loading.
- The label must still make sense read alone by a screen reader.
- Meaning and availability are never shown by colour alone.
- Icon-only actions are `ActionIcon`, not Button without text.

## Edge cases

- **Rejected save** (invoice due date invalid): the value stays in the field to
  fix, and the button doesn't pretend the save succeeded.
- **Stock changed while adding to cart**: show the explanation and the current
  offer; an animation alone is not confirmation that the item was added.
- **Removing access** uses `variant="danger"` and explains the impact first. A
  rejected request never switches the UI to "Removed". Danger is not used for
  merely closing a panel.

## Related

- [Feedback and actions](../../ux-guidelines/references/feedback-and-actions.md): where actions live, `[Cancel] [Primary]` order.
- [States](../../ux-guidelines/references/states.md): disabled and loading.
- [Dialog](../../dialog-usage/references/ux.md): destructive confirmations.
