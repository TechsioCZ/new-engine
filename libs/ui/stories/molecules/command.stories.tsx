import type { Meta, StoryObj } from "@storybook/react"
import { type Ref, useRef, useState } from "react"
import { fn } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Button } from "../../src/atoms/button"
import { Hotkeys } from "../../src/atoms/hotkeys"
import { Icon, type IconType } from "../../src/atoms/icon"
import {
  Command,
  type CommandItem,
  type CommandProps,
} from "../../src/molecules/command"
import { Dialog } from "../../src/molecules/dialog"

const actionIcons: Record<string, IconType> = {
  overview: "token-icon-home",
  orders: "token-icon-shopping-bag",
  settings: "icon-[mdi--cog-outline]",
}

const actions: CommandItem[] = [
  {
    value: "overview",
    label: "Overview",
    keywords: ["home"],
    group: "Navigation",
  },
  {
    value: "orders",
    label: "Orders",
    keywords: ["invoice", "purchase"],
    group: "Navigation",
  },
  {
    value: "settings",
    label: "Settings",
    keywords: ["preferences"],
    group: "Account",
  },
]

function CommandResults({ grouped = false }: { grouped?: boolean }) {
  return (
    <>
      <Command.List>
        <Command.Context>
          {(api) =>
            grouped
              ? [
                  ...new Set(api.collection.items.map((item) => item.group)),
                ].map((group) => (
                  <Command.ItemGroup
                    id={group ?? "Other"}
                    key={group ?? "Other"}
                  >
                    <Command.ItemGroupLabel htmlFor={group ?? "Other"}>
                      {group ?? "Other"}
                    </Command.ItemGroupLabel>
                    {api.collection.items
                      .filter((item) => item.group === group)
                      .map((item) => (
                        <Command.Item item={item} key={item.value}>
                          <Icon
                            icon={
                              actionIcons[item.value] ??
                              "token-icon-file-document"
                            }
                            size="md"
                          />
                          <Command.ItemText />
                        </Command.Item>
                      ))}
                  </Command.ItemGroup>
                ))
              : api.collection.items.map((item) => (
                  <Command.Item item={item} key={item.value}>
                    <Icon
                      icon={
                        actionIcons[item.value] ?? "token-icon-file-document"
                      }
                      size="md"
                    />
                    <Command.ItemText />
                  </Command.Item>
                ))
          }
        </Command.Context>
      </Command.List>
      <Command.Empty>No matching actions</Command.Empty>
      <p className="flex flex-wrap items-center gap-150 border-t border-border-primary px-100 pt-150 text-fg-secondary text-xs">
        <span>
          <Hotkeys hotkey="ArrowUp" /> <Hotkeys hotkey="ArrowDown" /> to
          navigate
        </span>
        <span>
          <Hotkeys hotkey="Enter" /> to run an action
        </span>
      </p>
    </>
  )
}

function CommandExample({
  grouped,
  inputRef,
  description = "Search an action by name or keyword. Type invoice to find Orders, then press Enter or click it to change the view.",
  onAction,
  ...args
}: CommandProps & {
  grouped?: boolean
  inputRef?: Ref<HTMLInputElement>
  description?: string
  onAction?: (item: CommandItem) => void
}) {
  const [currentView, setCurrentView] = useState("Overview")

  return (
    <div className="flex w-full flex-col gap-200">
      <p>{description}</p>
      <Command
        {...args}
        onSelect={(details) => {
          args.onSelect?.(details)
          const item = args.items.find(
            ({ value }) => value === details.itemValue
          )
          if (!item || item.disabled) {
            return
          }
          setCurrentView(item.label)
          onAction?.(item)
        }}
      >
        <Command.Label>Actions</Command.Label>
        <Command.Control>
          <Command.Input placeholder="Search actions…" ref={inputRef} />
        </Command.Control>
        <CommandResults grouped={grouped} />
      </Command>
      <div
        aria-live="polite"
        className="flex flex-col gap-100 rounded-sm border border-border-primary p-200"
      >
        <p>
          Current view:{" "}
          <output data-testid="command-result">{currentView}</output>
        </p>
        <p>
          {currentView === "Overview"
            ? "Choose an action to change this demo view."
            : `You selected ${currentView}.`}
        </p>
      </div>
    </div>
  )
}

const meta = {
  title: "Molecules/Command",
  component: Command,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    controls: { disable: true },
    docs: {
      description: {
        component:
          "Command is a command palette: a searchable, keyboard-first list of application actions and destinations, often opened with ⌘K (Ctrl+K on Windows/Linux). Type to filter by label or keyword, use ↑/↓ to navigate, and press Enter or click to run an action. Unlike Combobox, it runs actions rather than choosing a form value; use Select for a fixed set of form choices and Menu for a short action list that does not need search. Compose Command with Dialog for a modal palette, and add Hotkeys only when the application actually registers those shortcuts. Your application owns action handlers, permissions and whether selection closes the palette.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="mx-auto w-full max-w-md">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    disabled: { control: "boolean" },
    loopFocus: { control: "boolean" },
    locale: { control: "text" },
    id: { table: { disable: true } },
    ref: { table: { disable: true } },
    children: { table: { disable: true } },
  },
  args: {
    items: actions,
    disabled: false,
    loopFocus: true,
    onSelect: fn(),
    children: null,
  },
} satisfies Meta<typeof Command>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  parameters: {
    controls: { disable: false, include: ["disabled", "loopFocus", "locale"] },
    docs: {
      description: {
        story:
          "An inline action search filters navigation destinations by label or keyword; try invoice, then press Enter to update the demo workspace.",
      },
    },
  },
  render: (args) => <CommandExample {...args} />,
}

export const States: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare an unavailable command surface with an empty search, so disabled and no-result behavior can be designed deliberately.",
      },
    },
  },
  render: (args) => (
    <VariantContainer>
      <VariantGroup title="Disabled">
        <CommandExample {...args} disabled />
      </VariantGroup>
      <VariantGroup title="No results">
        <CommandExample {...args} defaultInputValue="no-such-action" />
      </VariantGroup>
    </VariantContainer>
  ),
}

export const Grouped: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Navigation and Account headings follow the filtered actions, making a longer palette easier to scan without leaving empty groups.",
      },
    },
  },
  render: (args) => (
    <CommandExample
      {...args}
      grouped
      description="Actions are grouped by purpose. Search preferences to show Settings in Account, or clear the query to restore both groups."
    />
  ),
}

export const DisabledItems: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Orders remains visible but unavailable; keyboard navigation skips it and the explanatory text tells users why.",
      },
    },
  },
  tags: ["!dev", "!autodocs"],
  args: {
    items: actions.map((item) => ({
      ...item,
      disabled: item.value === "orders",
    })),
  },
  render: (args) => (
    <CommandExample
      {...args}
      description="Orders is unavailable while the order service is offline. Search invoice to see it, or choose another available destination."
    />
  ),
}

export const Localized: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Locale-aware matching finds Czech labels without accents and searches alternate keywords, keeping translated actions discoverable.",
      },
    },
  },
  tags: ["!dev", "!autodocs"],
  args: {
    locale: "cs",
    items: [
      { value: "overview", label: "Přehled" },
      { value: "orders", label: "Objednávky", keywords: ["faktura"] },
    ],
  },
  render: (args) => (
    <CommandExample
      {...args}
      description="Czech labels, without case or accent sensitivity. Try prehled for Přehled, or faktura to find Objednávky by its keyword."
    />
  ),
}

function ChangingItemsExample(args: CommandProps) {
  const [items, setItems] = useState(args.items)
  const orders = items.find((item) => item.value === "orders")
  return (
    <div className="flex flex-col gap-200">
      <div className="flex flex-wrap gap-100">
        <Button
          disabled={!orders || orders.disabled}
          onClick={() =>
            setItems((current) =>
              current.map((item) =>
                item.value === "orders" ? { ...item, disabled: true } : item
              )
            )
          }
        >
          Disable Orders
        </Button>
        <Button
          disabled={!orders}
          onClick={() =>
            setItems((current) =>
              current.filter((item) => item.value !== "orders")
            )
          }
        >
          Remove Orders
        </Button>
        <Button onClick={() => setItems(args.items)} theme="outlined">
          Reset actions
        </Button>
      </div>
      <p>
        Orders:{" "}
        <output>
          {orders ? (orders.disabled ? "Disabled" : "Available") : "Removed"}
        </output>
      </p>
      <CommandExample
        {...args}
        items={items}
        description="Search invoice, then disable or remove Orders. Disabled actions stay unavailable; removed actions leave the results. Reset actions lets you try again."
      />
    </div>
  )
}

export const ChangingItems: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Disable or remove an action after searching to verify that stale highlighted results cannot be activated.",
      },
    },
  },
  tags: ["!dev", "!autodocs"],
  render: (args) => <ChangingItemsExample {...args} />,
}

export const InlineFocus: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "An inline Command participates in normal Tab order rather than trapping focus like a modal palette.",
      },
    },
  },
  tags: ["!dev", "!autodocs"],
  render: (args) => (
    <div className="flex flex-col items-start gap-200">
      <Button>Before command</Button>
      <CommandExample {...args} />
      <Button>After command</Button>
    </div>
  ),
}

function ControlledQueryExample(args: CommandProps) {
  const [query, setQuery] = useState("invoice")
  return (
    <div className="flex flex-col items-start gap-200">
      <Button onClick={() => setQuery("preferences")}>
        Search preferences
      </Button>
      <CommandExample
        {...args}
        inputValue={query}
        onInputValueChange={({ inputValue }) => setQuery(inputValue)}
      />
      <p data-testid="command-query">{query}</p>
    </div>
  )
}

export const ControlledQuery: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "An external button updates a controlled query while typing and the keyboard result collection stay synchronized.",
      },
    },
  },
  tags: ["!dev", "!autodocs"],
  render: (args) => <ControlledQueryExample {...args} />,
}

function DialogExample(args: CommandProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className="flex flex-col items-start gap-200">
      <p>
        A searchable dialog without shortcuts. It stays open after an action so
        you can select it again. Escape closes it and returns focus to the
        opener.
      </p>
      <Button onClick={() => setOpen(true)} ref={triggerRef}>
        Open command palette
      </Button>
      <Dialog
        customTrigger
        description="Search and run an action."
        finalFocusEl={() => triggerRef.current}
        initialFocusEl={() => inputRef.current}
        onOpenChange={({ open }) => setOpen(open)}
        open={open}
        title="Command palette"
      >
        <CommandExample
          {...args}
          inputRef={inputRef}
          description="Search invoice and press Enter to change the selected view. Escape closes the palette."
          onEscape={() => setOpen(false)}
        />
      </Dialog>
    </div>
  )
}

export const InDialog: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A button opens a modal command palette with search focused; Escape closes it and restores focus, while repeated selections stay available in this demo.",
      },
    },
  },
  render: (args) => <DialogExample {...args} />,
}
