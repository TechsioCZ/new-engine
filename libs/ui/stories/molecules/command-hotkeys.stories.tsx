import type { Meta, StoryObj } from "@storybook/react"
import { useEffect, useRef, useState } from "react"
import { expect, userEvent, waitFor, within } from "storybook/test"
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
  scopeHotkeysToPreview = false,
}: {
  initiallyOpen?: boolean
  showAvailability?: boolean
  scopeHotkeysToPreview?: boolean
}) {
  const [store] = useState(() => createHotkeyStore())
  const [open, setOpen] = useState(initiallyOpen)
  const [canSave, setCanSave] = useState(true)
  const [saveCount, setSaveCount] = useState(0)
  const [currentView, setCurrentView] = useState("Overview")
  const [result, setResult] = useState("Choose an action")
  const trigger = useRef<HTMLButtonElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const preview = useRef<HTMLDivElement>(null)

  // Inline Docs canvases share a document, including portaled dialogs. The
  // focused preview owns shortcuts until its palette closes; other canvases
  // must not open a second modal or run the same action in the background.
  function ownsKeyboard() {
    return (
      !scopeHotkeysToPreview ||
      open ||
      (preview.current?.contains(document.activeElement) ?? false)
    )
  }

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
        enabled: ownsKeyboard,
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
        enabled: () => canSave && ownsKeyboard(),
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
    <div
      className="mx-auto flex w-full max-w-md flex-col gap-200"
      ref={preview}
    >
      <p>
        Press <Hotkeys hotkey="mod+K" /> or click Open command palette. Choose
        an action to update the workspace below.
      </p>
      <p className="text-fg-secondary">
        Focus a button in this preview first if you are on the Docs page or
        focus is still in Storybook&apos;s sidebar.
      </p>
      <div className="flex flex-wrap gap-150">
        <Button onClick={() => setOpen(true)} ref={trigger}>
          Open command palette <Hotkeys aria-hidden="true" hotkey="mod+K" />
        </Button>
        <Button disabled={!canSave} onClick={saveDocument} theme="outlined">
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
      {showAvailability && (
        <p className="text-fg-secondary text-sm">
          {canSave
            ? "Saving is available. Disable it to inspect all three activation paths."
            : "Saving is disabled for this demo. Enable saving to run the action again."}
        </p>
      )}
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
          Documents saved:{" "}
          <output data-testid="palette-save-count">{saveCount}</output>
        </p>
      </div>
      <output
        aria-hidden="true"
        className="sr-only"
        data-testid="palette-registrations"
      >
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
                            {icon && <Icon icon={icon} size="md" />}
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
          <Command.Empty>
            No matching actions. Try “save” or “documentation”.
          </Command.Empty>
          <p className="flex flex-wrap items-center gap-150 border-border-primary border-t pt-150 text-fg-secondary text-xs">
            <span>↑ ↓ to navigate</span>
            <span>
              <Hotkeys hotkey="Enter" /> to run
            </span>
            <span>
              <Hotkeys hotkey="Escape" /> to close
            </span>
          </p>
        </Command>
      </Dialog>
    </div>
  )
}

const meta = {
  title: "Molecules/Command/With Hotkey",
  component: PaletteExample,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    controls: { disable: true },
    docs: {
      description: {
        component:
          "A complete ⌘K / Ctrl+K command palette composed from Command, Dialog and the application hotkey store. Search grouped actions, inspect real shortcut hints, and run the same Save action from a button, shortcut or search result. Command supplies the searchable action list; Dialog owns modal focus and dismissal, while useHotkeys registers shortcuts. Use Combobox or Select instead when choosing a form value, and Menu for a short list of actions without search.",
      },
    },
  },
  argTypes: {
    initiallyOpen: { table: { disable: true } },
    scopeHotkeysToPreview: { table: { disable: true } },
    showAvailability: {
      control: "boolean",
      description:
        "Show the availability toggle to compare enabled and disabled actions.",
    },
  },
  args: { initiallyOpen: false, showAvailability: false },
  render: (args, { viewMode }) => (
    <PaletteExample {...args} scopeHotkeysToPreview={viewMode === "docs"} />
  ),
} satisfies Meta<typeof PaletteExample>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  parameters: {
    controls: { disable: false, include: ["showAvailability"] },
    docs: {
      description: {
        story:
          "Open the palette with the visible button or ⌘K / Ctrl+K, search persist or documentation, and run an action to update the workspace and close the dialog.",
      },
    },
  },
}
export const OpenPalette: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "The already-open palette shows grouped actions, recognizable icons, registered shortcut hints and the search field ready for keyboard input.",
      },
    },
  },
  tags: ["!dev", "!autodocs"],
  args: { initiallyOpen: true },
}

export const Availability: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Toggle saving availability to verify that the Save button, shortcut and palette option all respect the same application state.",
      },
    },
  },
  tags: ["!dev", "!autodocs"],
  args: { showAvailability: true },
}

export const ShortcutIsolation: Story = {
  tags: ["!dev", "!autodocs"],
  parameters: {
    docs: {
      description: {
        story:
          "Two independent previews share one document to verify that shortcuts open one accessible palette and update only the focused workspace.",
      },
    },
  },
  render: () => (
    <div className="flex flex-col gap-400">
      <section aria-label="First workspace">
        <PaletteExample scopeHotkeysToPreview />
      </section>
      <section aria-label="Second workspace">
        <PaletteExample scopeHotkeysToPreview />
      </section>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const document = canvasElement.ownerDocument
    const body = within(document.body)
    const modifier = /Mac|iPhone|iPad|iPod/.test(
      document.defaultView?.navigator.platform ?? ""
    )
      ? "Meta"
      : "Control"
    const workspaces = [
      within(canvas.getByRole("region", { name: "First workspace" })),
      within(canvas.getByRole("region", { name: "Second workspace" })),
    ] as const

    for (const [index, workspace] of workspaces.entries()) {
      const opener = workspace.getByRole("button", {
        name: "Open command palette",
      })
      opener.focus()
      await userEvent.keyboard(`{${modifier}>}k{/${modifier}}`)
      const dialog = await body.findByRole("dialog", {
        name: "Command palette",
      })
      await expect(body.getAllByRole("dialog")).toHaveLength(1)
      await expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1)
      await waitFor(() =>
        expect(within(dialog).getByRole("combobox")).toHaveFocus()
      )
      // Saving from the portaled dialog must still belong to this preview.
      await userEvent.keyboard(`{${modifier}>}s{/${modifier}}`)
      await waitFor(() => expect(opener).toHaveFocus())
      await expect(
        workspace.getByTestId("palette-save-count")
      ).toHaveTextContent("1")
      if (index === 0) {
        await expect(
          workspaces[1].getByTestId("palette-save-count")
        ).toHaveTextContent("0")
      }
      await expect(body.queryAllByRole("dialog")).toHaveLength(0)
      await userEvent.keyboard(`{${modifier}>}k{/${modifier}}`)
      await body.findByRole("dialog", { name: "Command palette" })
      await userEvent.keyboard("{Escape}")
      await waitFor(() => expect(opener).toHaveFocus())
    }
  },
}
