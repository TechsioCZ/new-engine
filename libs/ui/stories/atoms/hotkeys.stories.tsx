import type { Meta, StoryObj } from "@storybook/react"
import { StrictMode, useEffect, useRef, useState } from "react"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Button } from "../../src/atoms/button"
import { Checkbox } from "../../src/atoms/checkbox"
import { Hotkeys, type HotkeysProps } from "../../src/atoms/hotkeys"
import { Input } from "../../src/atoms/input"
import {
  createHotkeyStore,
  type HotkeyStore,
  useHotkey,
  useHotkeyRegistrations,
  useHotkeys,
} from "../../src/hotkeys"
import { Dialog } from "../../src/molecules/dialog"
import {
  HotkeysHydrationFixture,
  HotkeysStrictModeFixture,
} from "./hotkeys-hydration.fixture"

function PlaygroundExample({
  hotkey = "mod+Shift+A",
  formatOptions,
}: HotkeysProps) {
  const [store] = useState(() => createHotkeyStore())
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  function openExample() {
    setOpen(true)
  }

  useEffect(() => {
    store.init({ target: document })
    return () => store.destroy()
  }, [store])

  useHotkey({
    store,
    hotkey,
    action: openExample,
    options: { preventDefault: true, requireReset: true, stopPropagation: true },
  })
  const registrations = useHotkeyRegistrations({ store })

  return (
    <div className="flex flex-col items-start gap-200">
      <p>
        Press the shortcut or use the button. Both open the same dialog, while
        the keycap adapts to the selected platform.
      </p>
      <Button onClick={openExample} ref={trigger}>
        Open example
        <Hotkeys
          aria-hidden="true"
          formatOptions={formatOptions}
          hotkey={hotkey}
        />
      </Button>
      <p className="text-fg-secondary">
        Registered shortcuts:{" "}
        <output data-testid="hotkeys-playground-registrations">
          {registrations.length}
        </output>
      </p>
      <Dialog
        customTrigger
        description="Both the button and keyboard shortcut open this dialog. Press Escape to close it and try again."
        finalFocusEl={() => trigger.current}
        onOpenChange={({ open }) => setOpen(open)}
        open={open}
        title="Hotkey activated"
      >
        <p>
          Keyboard shortcut: <Hotkeys formatOptions={formatOptions} hotkey={hotkey} />
        </p>
      </Dialog>
    </div>
  )
}

function FormFieldsTechnicalExample() {
  const [store] = useState(() => createHotkeyStore())
  const [count, setCount] = useState(0)
  const [enableWhileTyping, setEnableWhileTyping] = useState(true)

  useEffect(() => {
    store.init({ target: document })
    return () => store.destroy()
  }, [store])

  useHotkey({
    store,
    hotkey: "mod+S",
    action: () => setCount((value) => value + 1),
    options: {
      enableOnFormTags: enableWhileTyping,
      preventDefault: true,
      requireReset: true,
    },
  })

  return (
    <div className="flex flex-col gap-200">
      <p>
        Write a note, then press the save shortcut. The saved count increases
        without leaving the input. Use the checkbox to pause saving while typing.
      </p>
      <Button onClick={() => setCount((value) => value + 1)}>Save</Button>
      <Hotkeys hotkey="mod+S" />
      <p>
        Saved: <output data-testid="hotkeys-count">{count}</output>
      </p>
      <p id="writing-help">
        {enableWhileTyping
          ? "Saving from the input is enabled."
          : "Saving from the input is paused. The browser may handle the shortcut instead."}
      </p>
      <label className="flex items-center gap-150">
        <Checkbox
          checked={enableWhileTyping}
          onChange={(event) => setEnableWhileTyping(event.target.checked)}
        />
        Enable shortcut while typing
      </label>
      <Input
        aria-describedby="writing-help"
        aria-label="Text input"
        placeholder="Try the shortcut here"
      />
      <details>
        <summary>Try rich-text editing too</summary>
        <div className="mt-150 flex flex-col gap-150">
          <p>Rich-text shortcuts are separately disabled in this example.</p>
          {/* biome-ignore lint/a11y/useSemanticElements: Exercises native contenteditable behavior, not a form control. */}
          <div
            contentEditable
            suppressContentEditableWarning
            aria-label="Rich editor"
            aria-multiline="true"
            className="rounded-sm border border-border-primary p-200"
            role="textbox"
            tabIndex={0}
          >
            <span data-testid="inherited-editor">Editable text</span>
          </div>
          {/* biome-ignore lint/a11y/useSemanticElements: Exercises plaintext-only contenteditable behavior, not a textarea. */}
          <div
            contentEditable="plaintext-only"
            suppressContentEditableWarning
            aria-label="Plain editor"
            aria-multiline="true"
            className="rounded-sm border border-border-primary p-200"
            role="textbox"
            tabIndex={0}
          >
            Plain editable text
          </div>
        </div>
      </details>
    </div>
  )
}

const meta = {
  title: "Atoms/Hotkeys",
  component: Hotkeys,
  tags: ["autodocs"],
  parameters: { layout: "padded", controls: { disable: true } },
  decorators: [
    (Story) => (
      <div className="mx-auto w-full max-w-md">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    hotkey: { control: "text" },
    formatOptions: { control: "object" },
    ref: { table: { disable: true } },
    children: { table: { disable: true } },
  },
  args: { hotkey: "mod+K" },
} satisfies Meta<typeof Hotkeys>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  args: { hotkey: "mod+Shift+A" },
  parameters: {
    controls: { disable: false, include: ["hotkey", "formatOptions"] },
  },
  render: (args) => <PlaygroundExample {...args} />,
}

export const TokenClassOverride: Story = {
  tags: ["!dev", "!autodocs"],
  args: { className: "text-hotkeys-key-fg" },
  render: (args) => <Hotkeys {...args} />,
}

function PlatformsExample() {
  const [store] = useState(() => createHotkeyStore())
  const [count, setCount] = useState(0)
  useEffect(() => {
    store.init({ target: document })
    return () => store.destroy()
  }, [store])
  function save() {
    setCount((value) => value + 1)
  }
  useHotkey({
    store,
    hotkey: "mod+S",
    action: save,
    options: { preventDefault: true, requireReset: true },
  })
  return (
    <div className="flex flex-col gap-300">
      <p>
        Save with the button or the shortcut shown on it. Below are previews
        of the same shortcut on each platform; your keyboard uses your actual OS.
      </p>
      <Button onClick={save}>
        Save <Hotkeys aria-hidden="true" hotkey="mod+S" />
      </Button>
      <p>Saved: <output data-testid="hotkeys-platform-save-count">{count}</output></p>
      <VariantContainer>
        <VariantGroup title="macOS">
          <Hotkeys hotkey="mod+S" formatOptions={{ platform: "mac" }} />
        </VariantGroup>
        <VariantGroup title="Windows">
          <Hotkeys hotkey="mod+S" formatOptions={{ platform: "windows" }} />
        </VariantGroup>
        <VariantGroup title="Linux">
          <Hotkeys hotkey="mod+S" formatOptions={{ platform: "linux" }} />
        </VariantGroup>
      </VariantContainer>
    </div>
  )
}

export const Platforms: Story = {
  render: () => <PlatformsExample />,
}

function CompoundExample() {
  const [store] = useState(() => createHotkeyStore())
  const [bold, setBold] = useState(false)
  useEffect(() => {
    store.init({ target: document })
    return () => store.destroy()
  }, [store])
  function toggleBold() {
    setBold((value) => !value)
  }
  useHotkey({
    store,
    hotkey: "Control+B",
    action: toggleBold,
    options: { preventDefault: true, requireReset: true },
  })
  return (
    <div className="flex flex-col items-start gap-200">
      <p>
        Press Control+B or click Bold to change the sample text. The shortcut
        uses individual Root, Key and Separator parts with explicit labels.
      </p>
      <Button aria-pressed={bold} onClick={toggleBold} theme="outlined">
        Bold
        <Hotkeys.Root aria-hidden="true">
          <Hotkeys.Key>Ctrl</Hotkeys.Key>
          <Hotkeys.Separator />
          <Hotkeys.Key>B</Hotkeys.Key>
        </Hotkeys.Root>
      </Button>
      <p className={bold ? "font-bold" : "font-normal"} data-testid="hotkeys-sample">
        A keyboard shortcut can format this text.
      </p>
      <p>Formatting: <output data-testid="hotkeys-format">{bold ? "Bold" : "Regular"}</output></p>
    </div>
  )
}

export const Compound: Story = {
  render: () => <CompoundExample />,
}

export const FormFields: Story = {
  render: () => <FormFieldsExample />,
}

function FormFieldsExample() {
  const [store] = useState(() => createHotkeyStore())
  const [draft, setDraft] = useState("")
  const [savedNote, setSavedNote] = useState("")

  useEffect(() => {
    store.init({ target: document })
    return () => store.destroy()
  }, [store])

  function saveNote() {
    setSavedNote(draft.trim() || "(empty note)")
  }

  useHotkey({
    store,
    hotkey: "mod+S",
    action: saveNote,
    options: { preventDefault: true, requireReset: true },
  })

  return (
    <div className="flex flex-col gap-200">
      <p>
        Type a note, then press the shortcut or click Save. The saved note
        appears below the editor.
      </p>
      <Input
        aria-label="Note"
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Write a note"
        value={draft}
      />
      <Button onClick={saveNote}>
        Save <Hotkeys aria-hidden="true" hotkey="mod+S" />
      </Button>
      <p aria-live="polite" className="rounded-sm border border-border-primary p-200">
        Saved note:{" "}
        <output data-testid="hotkeys-saved-note">
          {savedNote || "Nothing saved yet"}
        </output>
      </p>
    </div>
  )
}

export const FormFieldsTechnical: Story = {
  tags: ["!dev", "!autodocs"],
  render: () => <FormFieldsTechnicalExample />,
}

function LifecycleRegistrations({ store }: { store: HotkeyStore }) {
  const [amount, setAmount] = useState(1)
  const [enabled, setEnabled] = useState(true)
  const [functional, setFunctional] = useState(false)
  const [alternate, setAlternate] = useState(false)
  const [extra, setExtra] = useState(true)
  const [reversed, setReversed] = useState(false)
  const [keyup, setKeyup] = useState(false)
  const [count, setCount] = useState(0)
  const commands = [
    {
      id: "save",
      hotkey: alternate ? "mod+D" : "mod+S",
      label: alternate ? "Save draft" : "Save",
      enabled: functional ? () => enabled : enabled,
      action: () => setCount((value) => value + amount),
      keywords: ["document"],
      options: {
        requireReset: true,
        eventType: keyup ? ("keyup" as const) : ("keydown" as const),
      },
    },
    ...(extra
      ? [
          {
            id: "extra",
            hotkey: "mod+E",
            label: "Extra",
            action: () => setCount((value) => value + 10),
          },
        ]
      : []),
  ]
  useHotkeys({ store, commands: reversed ? [...commands].reverse() : commands })
  const registrations = useHotkeyRegistrations({ store })
  return (
    <div className="flex flex-col gap-200">
      <div className="flex flex-wrap gap-100">
        <Button onClick={() => setAmount((value) => value + 1)}>
          Increase amount
        </Button>
        <Button onClick={() => setEnabled((value) => !value)}>
          Toggle enabled
        </Button>
        <Button onClick={() => setFunctional((value) => !value)}>
          Toggle function enabled
        </Button>
        <Button onClick={() => setAlternate((value) => !value)}>
          Change binding
        </Button>
        <Button onClick={() => setExtra((value) => !value)}>
          Toggle extra
        </Button>
        <Button onClick={() => setReversed((value) => !value)}>Reorder</Button>
        <Button onClick={() => setKeyup((value) => !value)}>
          Toggle keyup
        </Button>
      </div>
      <output data-testid="hotkeys-count">{count}</output>
      <output data-testid="hotkeys-amount">{amount}</output>
      <output data-testid="hotkeys-enabled">{String(enabled)}</output>
      <output data-testid="hotkeys-registrations">
        {registrations
          .map((command) => `${command.id}:${command.label}`)
          .sort()
          .join(",")}
      </output>
    </div>
  )
}

function SharedStoreExample() {
  const [store] = useState(() => createHotkeyStore())
  const [mounted, setMounted] = useState(true)
  const [sharedCount, setSharedCount] = useState(0)
  const [ownerSetups, setOwnerSetups] = useState(0)
  useEffect(() => {
    store.init({ target: document })
    setOwnerSetups((value) => value + 1)
    return () => store.destroy()
  }, [store])
  useHotkey({
    store,
    id: "shared",
    hotkey: "mod+J",
    label: "Shared",
    action: () => setSharedCount((value) => value + 1),
  })
  const registrations = useHotkeyRegistrations({ store })
  return (
    <div className="flex flex-col gap-200">
      <Button onClick={() => setMounted((value) => !value)}>
        Toggle consumer
      </Button>
      <output data-testid="hotkeys-shared-count">{sharedCount}</output>
      <output data-testid="hotkeys-owner-setups">{ownerSetups}</output>
      <output data-testid="hotkeys-registry-size">
        {registrations.length}
      </output>
      {mounted && <LifecycleRegistrations store={store} />}
    </div>
  )
}

// Browser regression fixtures stay directly addressable, outside the sidebar and docs.
export const Lifecycle: Story = {
  tags: ["!dev", "!autodocs"],
  render: () => (
    <StrictMode>
      <SharedStoreExample />
    </StrictMode>
  ),
}
export const DevelopmentStrictMode: Story = {
  tags: ["!dev", "!autodocs"],
  render: () => (
    <HotkeysStrictModeFixture>
      <SharedStoreExample />
    </HotkeysStrictModeFixture>
  ),
}

function DisplayOnlyExample() {
  const [store] = useState(() => createHotkeyStore())
  const registrations = useHotkeyRegistrations({ store })
  return (
    <div className="flex flex-col gap-200">
      <Hotkeys hotkey="mod+K" />
      <Hotkeys hotkey="mod+K" />
      <output data-testid="hotkeys-registry-size">
        {registrations.length}
      </output>
    </div>
  )
}

export const DisplayOnly: Story = {
  tags: ["!dev", "!autodocs"],
  render: () => <DisplayOnlyExample />,
}

function FocusedSequenceTechnicalExample() {
  const [store] = useState(() => createHotkeyStore({ activeScopes: "editor" }))
  const area = useRef<HTMLButtonElement>(null)
  const [getTarget] = useState(() => () => area.current)
  const [active, setActive] = useState(true)
  const [count, setCount] = useState(0)
  useEffect(() => {
    store.init({ target: document })
    return () => store.destroy()
  }, [store])
  useHotkey({
    store,
    hotkey: "g > h",
    scopes: ["editor"],
    action: () => setCount((value) => value + 1),
    options: { target: getTarget, requireReset: true },
  })
  const registrations = useHotkeyRegistrations({ store })
  return (
    <div className="flex flex-col gap-200">
      <p>
        Focus Run action with Tab, then press G followed by H. The sequence only
        works while that button has focus and the editor scope is active.
        Clicking the button runs the same action, regardless of shortcut scope.
      </p>
      <Button
        onClick={() => {
          store.setScope(active ? "other" : "editor")
          setActive(!active)
        }}
      >
        Toggle scope
      </Button>
      <p>
        Editor scope:{" "}
        <output>{active ? "Active" : "Inactive — shortcut paused"}</output>
      </p>
      <Button
        onClick={() => setCount((value) => value + 1)}
        ref={area}
        theme="outlined"
      >
        Run action <Hotkeys aria-hidden="true" hotkey="g > h" />
      </Button>
      <p>
        Actions run: <output data-testid="hotkeys-count">{count}</output>
      </p>
      <p>
        Registered shortcuts:{" "}
        <output data-testid="hotkeys-registry-size">
          {registrations.length}
        </output>{" "}
        (unchanged when the scope is paused)
      </p>
    </div>
  )
}

function FocusedSequenceExample() {
  const [store] = useState(() => createHotkeyStore())
  const demo = useRef<HTMLDivElement>(null)
  const [getTarget] = useState(() => () => demo.current)
  const [section, setSection] = useState<"overview" | "help">("overview")

  useEffect(() => {
    store.init({ target: document })
    return () => store.destroy()
  }, [store])

  function openHelp() {
    setSection("help")
  }

  useHotkey({
    store,
    hotkey: "g > h",
    action: openHelp,
    options: { target: getTarget, requireReset: true },
  })

  return (
    <div className="flex flex-col gap-200">
      <p>
        Click the outlined demo area (or Tab to it), then press G followed by
        H. The shortcut changes this section to Help; the button below performs
        the same action.
      </p>
      <div
        aria-label="Keyboard shortcut demo"
        className="rounded-sm border border-border-primary p-200 focus-visible:hotkeys-target-focus"
        ref={demo}
        role="region"
        tabIndex={0}
      >
        <h3 className="font-semibold">Keyboard shortcut demo</h3>
        <p>
          Shortcut target: <Hotkeys aria-hidden="true" hotkey="g > h" />
        </p>
        <h4 className="mt-200 font-semibold">
          Current section: {" "}
          <output data-testid="hotkeys-section">
            {section === "help" ? "Help" : "Overview"}
          </output>
        </h4>
        <p>
          {section === "help"
            ? "Help is open. Use the button below to return to Overview."
            : "This is the starting section. Press G then H while this area is focused."}
        </p>
        {section === "help" && (
          <Button onClick={() => setSection("overview")} theme="borderless">
            Back to overview
          </Button>
        )}
      </div>
      <Button onClick={openHelp} theme="outlined">
        Open help
      </Button>
    </div>
  )
}

export const FocusedSequence: Story = {
  render: () => <FocusedSequenceExample />,
}

export const FocusedSequenceTechnical: Story = {
  tags: ["!dev", "!autodocs"],
  render: () => <FocusedSequenceTechnicalExample />,
}
export const Hydration: Story = {
  tags: ["!dev", "!autodocs"],
  render: () => <HotkeysHydrationFixture />,
}

function NativeConflictExample() {
  const [store] = useState(() =>
    createHotkeyStore({ conflictBehavior: "replace" })
  )
  const [target, setTarget] = useState<HTMLButtonElement | null>(null)
  const [result, setResult] = useState("No action")
  useEffect(() => {
    store.init({ target: document })
    return () => store.destroy()
  }, [store])
  useHotkeys({
    store,
    commands: target
      ? [
          {
            id: "first",
            hotkey: "mod+K",
            action: () => setResult("first"),
            options: { target },
          },
          {
            id: "second",
            hotkey: "mod+K",
            action: () => setResult("second"),
            options: { target },
          },
        ]
      : [],
  })
  const registrations = useHotkeyRegistrations({ store })
  return (
    <div className="flex flex-col gap-200">
      <Button
        aria-label="Conflict target"
        onClick={() => setResult("second")}
        ref={setTarget}
      >
        <Hotkeys hotkey="mod+K" />
      </Button>
      <output data-testid="hotkeys-conflict-result">{result}</output>
      <output data-testid="hotkeys-registry-size">
        {registrations.length}
      </output>
    </div>
  )
}

export const NativeConflictPolicy: Story = {
  tags: ["!dev", "!autodocs"],
  render: () => <NativeConflictExample />,
}
