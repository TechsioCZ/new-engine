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
          "Combobox keeps native typing intact while controlled parent updates arrive in order. A restore to a still-pending query is treated as its acknowledgement; after the latest edit is acknowledged, older values are replacements. Async parents must discard out-of-order responses themselves. Use SearchSuggestions for catalog navigation.",
      },
    },
  },
} satisfies Meta<typeof Combobox>

export default meta
type Story = StoryObj<typeof meta>

function DelayedControlledQuery({
  initialQuery = "",
  onInputValueChange,
}: {
  initialQuery?: string
  onInputValueChange?: (value: string) => void
}) {
  const [query, setQuery] = useState(initialQuery)
  const pending = useRef<string[]>([])
  const firstQuery = useRef<string | undefined>(undefined)
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-200">
      <Combobox
        inputBehavior="none"
        inputValue={query}
        items={items}
        label="Controlled search"
        onInputValueChange={(next) => {
          firstQuery.current ??= next
          pending.current.push(next)
          onInputValueChange?.(next)
        }}
        open={false}
      />
      <Button
        onClick={() => setQuery(pending.current.shift() ?? query)}
        onPointerDown={(event) => event.preventDefault()}
        variant="secondary"
      >
        Acknowledge oldest query
      </Button>
      <Button
        onClick={() => setQuery(pending.current.splice(1, 1)[0] ?? query)}
        onPointerDown={(event) => event.preventDefault()}
        variant="secondary"
      >
        Acknowledge second query
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
        onClick={() => setQuery(firstQuery.current ?? query)}
        onPointerDown={(event) => event.preventDefault()}
        variant="secondary"
      >
        Restore first query
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

function editNativeQuery(input: HTMLInputElement, value: string) {
  const setValue = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  )?.set
  if (!setValue) {
    throw new Error("Native input value setter unavailable")
  }
  setValue.call(input, value)
  fireEvent.input(input, { inputType: "insertText" })
}

export const RestoreAcknowledgedQuery: Story = {
  tags: ["ui-runtime-regression"],
  render: (args) => (
    <DelayedControlledQuery onInputValueChange={args.onInputValueChange} />
  ),
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("combobox", {
      name: "Controlled search",
    }) as HTMLInputElement
    await userEvent.click(input)
    await userEvent.type(input, "ab")
    input.setSelectionRange(1, 1)
    fireEvent.click(
      canvas.getByRole("button", { name: "Acknowledge latest query" })
    )
    await waitFor(() =>
      expect(canvas.getByRole("status", { name: "Parent query" }).textContent).toBe(
        "ab"
      )
    )
    await expect(input).toHaveValue("ab")
    await expect(input.selectionStart).toBe(1)
    fireEvent.click(canvas.getByRole("button", { name: "Restore first query" }))
    await waitFor(() => expect(input).toHaveValue("a"))
    await expect(input).toHaveFocus()
    await expect(input.selectionStart).toBe(1)
    await expect(input.selectionEnd).toBe(1)
    await expect(args.onInputValueChange).toHaveBeenCalledTimes(2)
  },
}

export const SameValueEdit: Story = {
  tags: ["ui-runtime-regression"],
  render: (args) => (
    <DelayedControlledQuery
      initialQuery="ab"
      onInputValueChange={args.onInputValueChange}
    />
  ),
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("combobox", {
      name: "Controlled search",
    }) as HTMLInputElement
    await userEvent.click(input)
    editNativeQuery(input, "a")
    editNativeQuery(input, "ab")
    input.setSelectionRange(0, 0)
    await expect(input).toHaveValue("ab")
    // No parent update occurs: the latest native edit already equals its prop.
    await expect(
      canvas.getByRole("status", { name: "Parent query" }).textContent
    ).toBe("ab")
    await expect(input.selectionStart).toBe(0)
    fireEvent.click(canvas.getByRole("button", { name: "Restore first query" }))
    await waitFor(() => expect(input).toHaveValue("a"))
    await expect(input).toHaveFocus()
    await expect(input.selectionStart).toBe(1)
    await expect(input.selectionEnd).toBe(1)
    await expect(args.onInputValueChange).toHaveBeenCalledTimes(2)
  },
}

export const SkippedAcknowledgments: Story = {
  tags: ["ui-runtime-regression"],
  render: (args) => (
    <DelayedControlledQuery onInputValueChange={args.onInputValueChange} />
  ),
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("combobox", {
      name: "Controlled search",
    }) as HTMLInputElement
    await userEvent.click(input)
    for (const query of ["a", "ab", "abc"]) {
      editNativeQuery(input, query)
    }
    input.setSelectionRange(1, 1)
    fireEvent.click(
      canvas.getByRole("button", { name: "Acknowledge second query" })
    )
    await waitFor(() =>
      expect(canvas.getByRole("status", { name: "Parent query" }).textContent).toBe(
        "ab"
      )
    )
    await expect(input).toHaveValue("abc")
    await expect(input.selectionStart).toBe(1)
    // Acknowledging ab retires a too, even though abc remains unacknowledged.
    fireEvent.click(canvas.getByRole("button", { name: "Restore first query" }))
    await waitFor(() => expect(input).toHaveValue("a"))
    await expect(input).toHaveFocus()
    await expect(input.selectionStart).toBe(1)
    await expect(input.selectionEnd).toBe(1)
    await expect(args.onInputValueChange).toHaveBeenCalledTimes(3)
  },
}

export const RepeatedQueries: Story = {
  tags: ["ui-runtime-regression"],
  render: (args) => (
    <DelayedControlledQuery onInputValueChange={args.onInputValueChange} />
  ),
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("combobox", {
      name: "Controlled search",
    }) as HTMLInputElement
    await userEvent.click(input)
    await userEvent.type(input, "ab")
    await userEvent.keyboard("{Backspace}b")
    await expect(input).toHaveValue("ab")
    await expect(args.onInputValueChange).toHaveBeenCalledTimes(4)
    fireEvent.click(
      canvas.getByRole("button", { name: "Acknowledge latest query" })
    )
    await waitFor(() =>
      expect(
        canvas.getByRole("status", { name: "Parent query" })
      ).toHaveTextContent(/^ab$/)
    )
    fireEvent.click(canvas.getByRole("button", { name: "Restore first query" }))
    await waitFor(() => expect(input).toHaveValue("a"))
    await expect(input).toHaveFocus()
    await expect(args.onInputValueChange).toHaveBeenCalledTimes(4)

    // A replacement can also match a skipped middle edit, not just the first.
    for (const query of ["z", "External query", "z"]) {
      editNativeQuery(input, query)
    }
    input.setSelectionRange(1, 1)
    fireEvent.click(
      canvas.getByRole("button", { name: "Acknowledge latest query" })
    )
    await waitFor(() =>
      expect(
        canvas.getByRole("status", { name: "Parent query" })
      ).toHaveTextContent(/^z$/)
    )
    await expect(input).toHaveValue("z")
    await expect(input.selectionStart).toBe(1)
    fireEvent.click(
      canvas.getByRole("button", { name: "Replace query externally" })
    )
    await waitFor(() => expect(input).toHaveValue("External query"))
    await expect(input).toHaveFocus()
    await expect(args.onInputValueChange).toHaveBeenCalledTimes(7)
  },
}

export const InOrderAcknowledgments: Story = {
  tags: ["ui-runtime-regression"],
  render: (args) => (
    <DelayedControlledQuery onInputValueChange={args.onInputValueChange} />
  ),
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("combobox", {
      name: "Controlled search",
    }) as HTMLInputElement
    await userEvent.click(input)
    for (const query of ["a", "ab", "abc"]) {
      editNativeQuery(input, query)
    }
    input.setSelectionRange(2, 2)
    for (const query of ["a", "ab", "abc"]) {
      fireEvent.click(
        canvas.getByRole("button", { name: "Acknowledge oldest query" })
      )
      await waitFor(() =>
        expect(
          canvas.getByRole("status", { name: "Parent query" }).textContent
        ).toBe(query)
      )
      await expect(input).toHaveValue("abc")
      await expect(input).toHaveFocus()
      await expect(input.selectionStart).toBe(2)
      await expect(input.selectionEnd).toBe(2)
      await expect(args.onInputValueChange).toHaveBeenCalledTimes(3)
    }
    fireEvent.click(canvas.getByRole("button", { name: "Restore first query" }))
    await waitFor(() => expect(input).toHaveValue("a"))
    await expect(input).toHaveFocus()
    await expect(args.onInputValueChange).toHaveBeenCalledTimes(3)
  },
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
    // Once the latest edit is acknowledged, an earlier typed value is an
    // authoritative replacement, not another late echo from the edit history.
    fireEvent.click(canvas.getByRole("button", { name: "Restore first query" }))
    await waitFor(() =>
      expect(
        canvas.getByRole("status", { name: "Parent query" })
      ).toHaveTextContent(/^z$/)
    )
    await waitFor(() => expect(input).toHaveValue("z"))
    await expect(input).toHaveFocus()
    await expect(args.onInputValueChange).toHaveBeenCalledTimes(11)
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
