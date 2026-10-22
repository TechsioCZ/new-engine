import type { Meta, StoryObj } from "@storybook/react"
import { useRef, useState } from "react"
import {
  expect,
  fireEvent,
  fn,
  userEvent,
  waitFor,
  within,
} from "storybook/test"
import { Button } from "../../src/atoms/button"
import { Combobox } from "../../src/molecules/combobox"

const items = [
  { label: "Czech Republic", value: "cz" },
  { label: "Germany", value: "de" },
]

const meta = {
  title: "Molecules/Combobox/Input synchronization",
  component: Combobox,
  tags: ["autodocs"],
  args: { items, onInputValueChange: fn() },
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "Combobox keeps native typing intact while a controlled query makes a delayed round trip through application state; use SearchSuggestions for catalog navigation.",
      },
    },
  },
} satisfies Meta<typeof Combobox>

export default meta
type Story = StoryObj<typeof meta>

function DelayedControlledQuery({
  onInputValueChange,
}: {
  onInputValueChange?: (value: string) => void
}) {
  const [query, setQuery] = useState("")
  const pending = useRef<string[]>([])
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-200">
      <Combobox
        inputBehavior="none"
        inputValue={query}
        items={items}
        label="Controlled search"
        open={false}
        onInputValueChange={(next) => {
          pending.current.push(next)
          onInputValueChange?.(next)
        }}
      />
      <Button
        onClick={() => setQuery(pending.current.shift() ?? query)}
        onPointerDown={(event) => event.preventDefault()}
        variant="secondary"
      >
        Acknowledge oldest query
      </Button>
      <Button
        onClick={() => {
          setQuery(pending.current.at(-1) ?? query)
          pending.current = []
        }}
        onPointerDown={(event) => event.preventDefault()}
        variant="secondary"
      >
        Acknowledge latest query
      </Button>
      <Button
        onClick={() => setQuery("External query")}
        onPointerDown={(event) => event.preventDefault()}
        variant="secondary"
      >
        Replace query externally
      </Button>
      <output aria-label="Parent query">{query}</output>
    </div>
  )
}

export const DelayedParent: Story = {
  tags: ["ui-runtime-regression"],
  parameters: {
    docs: {
      description: {
        story:
          "Hold and replay parent query updates to deterministically verify that stale acknowledgements cannot erase newer native edits, while unrelated external replacements still take effect.",
      },
    },
  },
  render: (args) => (
    <DelayedControlledQuery onInputValueChange={args.onInputValueChange} />
  ),
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("combobox", {
      name: "Controlled search",
    }) as HTMLInputElement
    await userEvent.click(input)
    // Read the live DOM before every edit, just as a browser does. No await
    // between events: a render/effect must not be required to retain a key.
    const setValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    )?.set
    if (!setValue) {
      throw new Error("Native input value setter unavailable")
    }
    const values: string[] = []
    for (const character of "zzzzunknown") {
      setValue.call(input, input.value + character)
      fireEvent.input(input, { inputType: "insertText", data: character })
      values.push(input.value)
    }
    await expect(values).toEqual(
      Array.from("zzzzunknown", (_, index) => "zzzzunknown".slice(0, index + 1))
    )
    await expect(input).toHaveValue("zzzzunknown")
    input.setSelectionRange(4, 4)
    // A server/state acknowledgement is not a user focus change.
    fireEvent.click(
      canvas.getByRole("button", { name: "Acknowledge oldest query" })
    )
    await waitFor(() =>
      expect(
        canvas.getByRole("status", { name: "Parent query" })
      ).toHaveTextContent("z")
    )
    await expect(input).toHaveValue("zzzzunknown")
    await expect(input.selectionStart).toBe(4)
    fireEvent.click(
      canvas.getByRole("button", { name: "Acknowledge latest query" })
    )
    await waitFor(() =>
      expect(
        canvas.getByRole("status", { name: "Parent query" })
      ).toHaveTextContent("zzzzunknown")
    )
    await expect(input).toHaveValue("zzzzunknown")
    fireEvent.click(
      canvas.getByRole("button", { name: "Replace query externally" })
    )
    await waitFor(() => expect(input).toHaveValue("External query"))
    await expect(args.onInputValueChange).toHaveBeenCalledTimes(11)
    // External writes keep React's tracker aligned: clearing back to an older
    // machine snapshot and immediately typing must both notify exactly once.
    await userEvent.clear(input)
    await userEvent.type(input, "Draft")
    await expect(input).toHaveValue("Draft")
    await expect(args.onInputValueChange).toHaveBeenCalledTimes(17)
    await userEvent.tab()
    await waitFor(() => expect(input).toHaveValue("External query"))
    await expect(args.onInputValueChange).toHaveBeenCalledTimes(17)
  },
}
