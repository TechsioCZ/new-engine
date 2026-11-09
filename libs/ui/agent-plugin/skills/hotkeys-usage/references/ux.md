<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/hotkeys--3320-2.md, edited. Storybook: Atoms/Hotkeys → UX guidelines. -->

# Hotkeys: UX guidelines

Hotkeys shows a keyboard shortcut in the notation of the user's platform. It
only displays the keys: registering the shortcut and running the command are
the app's job.

## When to use

- Next to the command a shortcut triggers: a button, a tooltip, a Command
  palette result.
- In one discoverable list of shortcuts (help, the Command palette).

## Use something else when

| Need | Use instead |
| --- | --- |
| Explaining how to do something | help text or a `Tour` |
| The only way to run a command | a named `Button` or `Link`; the shortcut is an extra |

## Anatomy

- **Automatic form**: `<Hotkeys hotkey="mod+K" />` renders one keycap,
  formatted for the platform (`⌘K` on macOS, `Ctrl+K` elsewhere).
- **Compound form**: `Hotkeys.Root` with `Hotkeys.Key` and
  `Hotkeys.Separator`, when you need each key drawn separately.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `type=single` | `<Hotkeys hotkey="…" />` | Automatic, platform-formatted notation. |
| `type=compound` | `Hotkeys.Root` + `Hotkeys.Key` + `Hotkeys.Separator` | Keys drawn one by one. Give the root an `aria-label`. |
| `platform=auto` | no `formatOptions` | The kit picks the user's platform. |
| `platform=mac` / `windows` / `linux` | `formatOptions={{ platform: "mac" }}` … | Force one notation, for example in platform-specific docs. |
| `platform=custom` | compound form with your own keys | Only for a real mapping; changing the text creates no shortcut. |
| — | `size="sm" \| "md" \| "lg"` (default `md`) | Typography only; match the text it sits in. |

## Behaviour

**May:** show the combination that really works for this user and context.

**Must not:** promise a shortcut that isn't registered; show a shortcut that
conflicts with the browser or assistive technology as the only way to an
action.

- A displayed hint registers nothing. Register the command with `useHotkey`
  and pass it the same callback the button uses.
- The named button or link for the same command always stays available.
- Availability is the same everywhere: if the button is disabled, the
  shortcut does nothing too.
- Shortcuts don't fire while the user types in a field, unless they are
  meant for fields (`⌘Enter`).

## Content and copy

- Order modifiers consistently: `⌘ Shift K`. Platform keys come from the
  formatter; don't hand-write `Cmd` or `Ctrl`.
- The command name next to the hint follows button-label rules:
  `Save changes ⌘S` — cs: `Uložit změny ⌘S`.

## Accessibility

- Keys render as `<kbd>`. Inside a labelled button, hide the hint with
  `aria-hidden="true"` so the name isn't read twice.
- A compound hint standing alone needs `role="group"` and an `aria-label`
  (`Control plus K`).
- The hint adds no focus stop and needs no colour to be understood.

## Edge cases

- **Typing in a document field**: a character shortcut must not overwrite or
  trigger on what the user is typing.
- **`⌘S` shown next to Save**: pressing it saves exactly like the button;
  showing the keys never implies auto-save, and a failed save stays visible.

## Related

- [Accessibility](../../ux-guidelines/references/accessibility.md): keyboard support.
- [Command](../../command-usage/references/ux.md): showing shortcuts in the palette.
- [Tooltip](../../tooltip-usage/references/ux.md): shortcut hints on icon actions.
