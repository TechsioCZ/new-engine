import type { Meta, StoryObj } from "@storybook/react"
import { useEffect, useRef, useState } from "react"
import { Button } from "../../src/atoms/button"
import { Hotkeys } from "../../src/atoms/hotkeys"
import { Icon, type IconType } from "../../src/atoms/icon"
import {
  createHotkeyStore,
  useHotkeyRegistrations,
  useHotkeys,
} from "../../src/hotkeys"
import { Command, type CommandItem } from "../../src/molecules/command"
import { Dialog } from "../../src/molecules/dialog"

function PaletteExample({
  initiallyOpen = false,
  showAvailability = false,
}: {
  initiallyOpen?: boolean
  showAvailability?: boolean
}) {
  const [store] = useState(() => createHotkeyStore())
  const [open, setOpen] = useState(initiallyOpen)
  const [canSave, setCanSave] = useState(true)
  const [saveCount, setSaveCount] = useState(0)
  const [currentView, setCurrentView] = useState("Overview")
  const [result, setResult] = useState("Choose an action")
  const trigger = useRef<HTMLButtonElement>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    store.init({ target: document })
    return () => store.destroy()
  }, [store])

  function saveDocument() {
    if (!canSave) {
      return
    }
    setSaveCount((count) => count + 1)
    setCurrentView("Document")
    setResult("Document saved")
    setOpen(false)
  }

  function showHelp() {
    setCurrentView("Help")
    setResult("Help opened")
    setOpen(false)
  }

  useHotkeys({
    store,
    commands: [
      {
        id: "open-palette",
        hotkey: "mod+K",
        label: "Open command palette",
        category: "Navigation",
        action: () => setOpen(true),
        options: {
          preventDefault: true,
          requireReset: true,
          stopPropagation: true,
        },
      },
      {
        id: "save",
        hotkey: "mod+S",
        label: "Save document",
        category: "Document",
        keywords: ["persist"],
        action: saveDocument,
        enabled: canSave,
        options: {
          preventDefault: true,
          requireReset: true,
          stopPropagation: true,
        },
      },
    ],
  })

  const actions = [
    {
      value: "save",
      label: "Save document",
      group: "Document",
      disabled: !canSave,
      run: saveDocument,
    },
    {
      value: "help",
      label: "Help",
      group: "Support",
      keywords: ["documentation"],
      run: showHelp,
    },
  ]
  const registrations = useHotkeyRegistrations({ store })
  const items: CommandItem[] = actions.map((action) => {
    const registration = registrations.find(({ id }) => id === action.value)
    return {
      value: action.value,
      label: registration?.label ?? action.label,
      group: registration?.category ?? action.group,
      keywords: registration?.keywords ?? action.keywords,
      disabled: action.disabled,
    }
  })
  const icons: Record<string, IconType> = {
    save: "icon-[mdi--content-save-outline]",
    help: "icon-[mdi--help-circle-outline]",
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-200">
      <p>
        Press <Hotkeys hotkey="mod+K" /> or click Open command palette. Choose
        an action to update the workspace below.
      </p>
      <p className="text-fg-secondary">
        Click inside this preview first if focus is still in Storybook&apos;s
        sidebar.
      </p>
      <div className="flex flex-wrap gap-150">
        <Button onClick={() => setOpen(true)} ref={trigger}>
          Open command palette <Hotkeys aria-hidden="true" hotkey="mod+K" />
        </Button>
        <Button disabled={!canSave} onClick={saveDocument}>
          Save document <Hotkeys aria-hidden="true" hotkey="mod+S" />
        </Button>
        {showAvailability && (
          <Button
            onClick={() => setCanSave((enabled) => !enabled)}
            theme="outlined"
          >
            {canSave ? "Disable saving" : "Enable saving"}
          </Button>
        )}
      </div>
      <div
        aria-live="polite"
        className="flex flex-col gap-100 rounded-sm border border-border-primary p-200"
      >
        <p>
          Current view:{" "}
          <output data-testid="palette-current-view">{currentView}</output>
        </p>
        <p>
          Status: <output data-testid="palette-result">{result}</output>
        </p>
        <p>
          Documents saved: <output data-testid="palette-save-count">{saveCount}</output>
        </p>
      </div>
      <output aria-hidden="true" className="sr-only" data-testid="palette-registrations">
        {registrations.length}
      </output>
      <Dialog
        customTrigger
        description="Search an action and press Enter to update the workspace."
        finalFocusEl={() => trigger.current}
        initialFocusEl={() => input.current}
        onOpenChange={({ open }) => setOpen(open)}
        open={open}
        title="Command palette"
      >
        <Command
          items={items}
          onEscape={() => setOpen(false)}
          onSelect={({ itemValue }) =>
            actions.find(({ value }) => value === itemValue)?.run()
          }
        >
          <Command.Label>Actions</Command.Label>
          <Command.Control>
            <Command.Input placeholder="Search actions…" ref={input} />
          </Command.Control>
          <Command.List>
            <Command.Context>
              {(api) =>
                [
                  ...new Set(api.collection.items.map(({ group }) => group)),
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
                      .map((item) => {
                        const registration = registrations.find(
                          ({ id }) => id === item.value
                        )
                        const icon = icons[item.value]
                        return (
                          <Command.Item item={item} key={item.value}>
                            {icon && <Icon icon={icon} />}
                            <Command.ItemText />
                            {registration && (
                              <Hotkeys
                                aria-hidden="true"
                                hotkey={registration.hotkey}
                              />
                            )}
                          </Command.Item>
                        )
                      })}
                  </Command.ItemGroup>
                ))
              }
            </Command.Context>
          </Command.List>
          <Command.Empty>No matching actions</Command.Empty>
        </Command>
      </Dialog>
    </div>
  )
}

const meta = {
  title: "Molecules/Command/With Hotkey",
  component: PaletteExample,
  tags: ["autodocs"],
  parameters: { layout: "padded", controls: { disable: true } },
  argTypes: {
    initiallyOpen: { table: { disable: true } },
    showAvailability: { table: { disable: true } },
  },
  args: { initiallyOpen: false, showAvailability: false },
} satisfies Meta<typeof PaletteExample>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}
export const OpenPalette: Story = {
  tags: ["!dev", "!autodocs"],
  args: { initiallyOpen: true },
}

export const Availability: Story = {
  tags: ["!dev", "!autodocs"],
  args: { showAvailability: true },
}
