<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/command--3329-17222.md, edited. Storybook: Molecules/Command → UX guidelines. -->

# Command: UX guidelines

Command is a searchable, keyboard-first list of actions and destinations (a
command palette, often opened with ⌘K). The user types, moves to a command,
and runs it. Highlighting a command only makes it the candidate.

## When to use

- The user knows what they want to do and needs to find it fast among many
  commands and destinations.
- Power-user workflows in admin tools.

## Use something else when

| Need | Use instead |
| --- | --- |
| Choosing a value for a form field | `Combobox` |
| A short, fixed list of actions for one object | `Menu` |
| Catalog search for shoppers | `SearchForm` / `SearchSuggestions` |

## Anatomy

- **Search**: `Command.Label` and `Command.Input` inside `Command.Control`.
- **Results**: `Command.List` with `Command.Item` (`Command.ItemText`, an
  optional icon and a `Hotkeys` hint), optionally grouped in
  `Command.ItemGroup` + `Command.ItemGroupLabel`.
- **Empty**: `Command.Empty`, shown when the query matches nothing.

Command is the open list itself. A modal palette is Command inside a
`Dialog`, with a visible button that opens it.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `state=default` | — | Nothing highlighted yet. |
| `state=highlighted` | browser / kit state | The current candidate. Nothing has run. |
| `state=disabled-item` | item `disabled: true` | This command isn't available now; others are. |
| `state=disabled` | `disabled` | The whole palette can't be used now, for a reason the user can find. |
| `state=grouped` | items with `group` + `Command.ItemGroup` | Commands split by area. A group never runs anything. |
| `state=empty` | `Command.Empty` | The search worked and nothing matched. Not an outage. |

`grouped` and `empty` are content situations, not states of the component.

## Behaviour

**May:** filter commands by label and `keywords`, and run the chosen
available command on Enter or click.

**Must not:** run a command on highlight; act as a form value picker; be the
only way to reach a feature.

- Only `onSelect` runs a command. Moving with arrow keys or the pointer
  changes nothing.
- Closing without choosing changes nothing, and focus returns to the opener.
- The app confirms the result where the object lives (or with a toast). A
  destructive command asks for confirmation the same way the rest of the UI
  does.
- An unavailable command looks and reads different from "no match". A
  command the user may not run can't be activated, through the palette or its
  shortcut.
- With zero matches the query stays editable. If the app loads commands
  remotely, waiting and a load error are not shown as "no results".

## Content and copy

- Commands are verb + object: `Create product`, `Go to orders` — cs:
  `Vytvořit produkt`, `Přejít na objednávky`.
- Group headings name the area: `Navigation`, `Actions`, `Recent`.
- Placeholder `Type a command or search…` — cs: `Zadejte příkaz nebo hledejte…`. Empty: `No results for “exprt”` — cs: `Žádné výsledky pro „exprt“`.

## Accessibility

- The kit handles the listbox, arrow keys and Escape (`onEscape` closes a
  modal palette); the input takes focus when Command mounts.
- The highlighted command uses background and bold text, not colour alone.
- Items hold no buttons, inputs or links of their own.

## Edge cases

- **No permission to publish**: `Publish` is disabled or missing, and
  highlighting it changes nothing.
- **Empty palette**: explains that nothing matched; it never looks like the
  command already ran.

## Related

- [Component selection](../../ux-guidelines/references/component-selection.md): Command vs Combobox vs Menu.
- [Hotkeys](../../hotkeys-usage/references/ux.md): showing shortcuts.
- [Dialog](../../dialog-usage/references/ux.md): the modal shell.
