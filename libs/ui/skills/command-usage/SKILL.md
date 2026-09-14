---
component_version: "1.0.0"
name: command-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Command for a
  searchable action list or a Dialog-based command palette with compound parts,
  grouped results, disabled actions, and optional shortcut hints.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - zag-compound-components
  - app-token-overrides
sources:
  - "libs/ui/src/molecules/command.tsx"
  - "libs/ui/src/internal/molecules/command.context.ts"
  - "libs/ui/src/tokens/components/molecules/_command.css"
  - "libs/ui/stories/molecules/command.stories.tsx"
  - "libs/ui/src/molecules/dialog.tsx"
  - "libs/ui/test/command.spec.ts"
  - "https://zagjs.com/components/react/combobox"
---

# @techsio/ui-kit Command Usage

Use Command for searching and activating application actions. Use Combobox for
a form value, Menu for a short menu without search, and Dialog for the modal shell.

## Setup

```tsx
import { Command, type CommandItem } from "@techsio/ui-kit/molecules/command"

const items: CommandItem[] = [
  { value: "orders", label: "Orders", keywords: ["invoice"] },
  { value: "settings", label: "Settings", disabled: true },
]

<Command items={items} onSelect={({ itemValue }) => runAction(itemValue)}>
  <Command.Label>Actions</Command.Label>
  <Command.Control>
    <Command.Input placeholder="Search actions…" />
  </Command.Control>
  <Command.List>
    <Command.Context>
      {(api) => api.collection.items.map((item) => (
        <Command.Item key={item.value} item={item}>
          <Command.ItemText />
        </Command.Item>
      ))}
    </Command.Context>
  </Command.List>
  <Command.Empty>No matching actions</Command.Empty>
</Command>
```

Callable `Command` and `Command.Root` are the same root. It accepts `items`,
`disabled`, `loopFocus`, `locale`, `inputValue`, `defaultInputValue`,
`onInputValueChange`, `onSelect`, `onEscape`, `id`, `className` and `ref`.
It does not expose form selection or multi-selection flags.

The internal React contexts live outside the hot-reloaded component module so
compound parts keep the same provider identity during Storybook development.
This is an implementation detail and does not add another public component.

## Keep one result collection

Items have a stable string `value`, string `label`, optional `keywords`,
`disabled` and `group`. Values identify actions independently of translated
labels. Matching uses Zag's locale-aware substring filter across label and
keywords, preserving input order; it is not fuzzy ranking.

Render results from `Command.Context`'s `api.collection.items`, not the original
unfiltered array. Derive visible groups from these results and pair
`Command.ItemGroup id="navigation"` with
`Command.ItemGroupLabel htmlFor="navigation"`. Omit groups with no results.
Place `Command.Empty` outside the listbox; its status follows the same collection.

## Activate actions deliberately

Use `onSelect={({ itemValue }) => runAction(itemValue)}`, not highlight changes
or selected-value changes. Focusing and navigating must not run application
actions. Repeated activation of the same available action is supported.

An item is one listbox option. Icons, text and shortcut hints can decorate it;
do not put buttons, inputs or independently interactive links inside the option.
`Command.ItemText` defaults to the item's label.

The application owns callbacks and availability. No shortcut is required.
Command does not register hotkeys or dispatch synthetic keyboard events.
Keyboard scopes are not permissions: apply application availability to all
activation paths, including buttons, palette actions and registered shortcuts.

## Compose the existing Dialog

The kit's current Dialog is a single component, not `Dialog.Root` parts:

```tsx
<Button ref={triggerRef} onClick={() => setOpen(true)}>
  Open command palette
</Button>
<Dialog
  customTrigger
  open={open}
  onOpenChange={({ open }) => setOpen(open)}
  title="Command palette"
  description="Search and run an action."
  initialFocusEl={() => inputRef.current}
  finalFocusEl={() => triggerRef.current}
>
  <Command
    items={items}
    onSelect={({ itemValue }) => runAction(itemValue)}
    onEscape={() => setOpen(false)}
  >
    <Command.Label>Actions</Command.Label>
    <Command.Control><Command.Input ref={inputRef} /></Command.Control>
    {/* The same List, Context, Item and Empty composition shown above. */}
  </Command>
</Dialog>
```

Import Button and Dialog from their normal `@techsio/ui-kit/atoms/button` and
`@techsio/ui-kit/molecules/dialog` paths. The caller owns open state and stable
React refs. Always provide a visible opener; a keyboard shortcut is optional.

Wire `onEscape` for the modal palette: it forwards Zag's native escape-close
request. No second keydown listener or custom focus trap is needed. Inline Tab
keeps ordinary page traversal; Dialog owns modal focus containment and restoration.
The caller decides whether successful selection closes the palette.

The persistently open native Combobox focuses its input when Command mounts,
including inline use. Mount it deliberately; do not assume an unsupported
`autoFocus={false}` prop suppresses this upstream behavior.

## Query ownership and presentation

Use `defaultInputValue` for an initial query, or the
`inputValue`/`onInputValueChange` pair for an app-controlled query. Do not
attach a second `value`/`onChange` query state to `Command.Input`.

Input and Label reuse kit atoms. Other parts use `--*-command-*` tokens;
override those in the app token layer instead of repeating appearance classes.
The inline list does not require a floating positioner, portal or selected-item
indicator gutter. Root introduces no breakpoint-specific behavior.

Native Zag owns navigation and composition handling. Synthetic IME event tests
are not proof of every OS input method or physical keyboard layout. Do not claim
screen-reader certification or universal keyboard support from these examples.

## Storybook examples

Playground starts on `Overview`; type `invoice` and press Enter or click
`Orders` to change the visible demo view to `Orders`. Grouped shows the same
selection feedback while groups follow the query. ChangingItems demonstrates
availability and removal with a reset button. Localized demonstrates Czech
accent-insensitive matching. InDialog opens the palette with the input focused,
keeps the dialog open after a selection, and restores focus to the opener on
Escape. `Command/With Hotkey/Playground` adds one integrated palette where
`mod+K`, the Save button, `mod+S`, and a palette selection update the visible
workspace state.

Only Playground exposes relevant Controls. Technical regression fixtures and
the already-open visual fixture use `!dev` and `!autodocs`; their direct story
ids remain available to the browser tests.
