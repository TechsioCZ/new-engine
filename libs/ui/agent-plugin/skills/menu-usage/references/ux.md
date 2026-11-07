<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/menu--2774-35079.md (+ token-icon-menu-trigger, -menu-submenu, -menu-check), edited. Storybook: Molecules/Menu → UX guidelines. -->

# Menu: UX guidelines

A Menu lists the commands available for one object or area. Opening it and
moving through it runs nothing; only activating an item does.

## When to use

- Commands for one object or context: a row's `More actions`, the account
  menu, overflow of page header actions.

## Use something else when

| Need | Use instead |
| --- | --- |
| Choosing a form value | `Select` or `Combobox` |
| Searching many commands | `Command` |
| Switching views | `Tabs` |
| Custom content (a form, a picker) | `Popover` |
| One or two commands | `Button`s or `ActionIcon`s |

## Anatomy

- **Trigger**: a Button with `triggerText` and the menu-trigger chevron, or a
  `customTrigger` (an `ActionIcon` for overflow).
- **Items** (`items`): `action` (a command), `link` (navigation),
  `checkbox` and `radio` (a toggled option, marked with a check), `submenu`
  (one nested level, marked with a right chevron), `separator`.

A menu item is a command, not a form value.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` (default `md`) | Density of trigger and rows. No change of meaning. |
| — | `size="xs"` | Legacy, only for parents that forward `xs` (DataTable). Don't use in app code. |
| item disabled | item `disabled: true` | Not available now, for a real permission or condition. |
| menu-trigger glyph | `triggerIcon` (default `token-icon-menu-trigger`) | "Opens a list of commands". |
| — | `contextMenu` | Opens on right-click, long press or Shift+F10. |

## Behaviour

**May:** open, move through items, and run one named, available command.

**Must not:** run a command when the menu opens or an item is highlighted;
mix commands and navigation in one ungrouped list; nest more than one level.

- Activation runs the command on the object the menu belongs to. A disabled
  item does nothing.
- Closing without choosing changes nothing, and focus returns to the trigger.
- The app confirms the result on the object (or with a toast), not in the
  menu.
- Group with separators; destructive items go last, after a separator. Menu
  items have no danger tone in code, so the label carries the consequence,
  and an irreversible command opens a confirmation.
- Availability matches real permissions. Hide an item the user can never use;
  disable it only when the reason is obvious.

## Content and copy

- Items are verbs + object where needed: `Duplicate`, `Archive`,
  `Open order` — cs: `Duplikovat`, `Archivovat`, `Otevřít objednávku`.
- Add `…` when the item opens a dialog that asks for more: `Delete…` — cs:
  `Smazat…`.
- Never hide `Delete` under a vague `More` without saying what it does once
  opened.
- The overflow trigger is an `ActionIcon` with `aria-label="More actions"` —
  cs: `Další akce`.

## Accessibility

- The kit handles the menu role, arrow keys, typeahead, Escape and focus
  return.
- Highlighted is not chosen: checkbox and radio items show their state with a
  check, not by colour alone.
- Every item is reachable by keyboard; a small size never removes the only
  way to finish a task.

## Edge cases

- **`Duplicate order` highlighted by keyboard**: nothing is copied until the
  user presses Enter.
- **The user lacks permission to delete**: hide `Delete…`, or disable it with
  the condition visible; it never looks active and then fails.

## Related

- [Feedback and actions](../../ux-guidelines/references/feedback-and-actions.md): row actions, destructive actions.
- [UX writing](../../ux-guidelines/references/ux-writing.md): action labels.
- [Command](../../command-usage/references/ux.md): searchable commands.
- [ActionIcon](../../action-icon-usage/references/ux.md): the overflow trigger.
