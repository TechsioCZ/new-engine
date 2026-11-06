import type { Meta, StoryObj } from "@storybook/react"
import { useId } from "react"
import { expect, userEvent, within } from "storybook/test"
import { Input } from "../../src/atoms/input"
import { Label, type LabelProps } from "../../src/atoms/label"
import { StatusText } from "../../src/atoms/status-text"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"

function LabeledField(args: Omit<LabelProps, "htmlFor">) {
  const id = useId()
  const size = args.size === "current" ? "md" : args.size
  return <div className="grid w-xs max-w-full gap-100">
    <Label {...args} htmlFor={id} />
    <Input aria-describedby={`${id}-hint`} defaultValue="Mara Nováková" disabled={args.disabled ?? false} id={id} required={args.required} size={size} />
    <StatusText id={`${id}-hint`} size={size}>Use the name shown on your delivery address.</StatusText>
  </div>
}

const meta = {
  title: "Atoms/Label",
  component: Label,
  tags: ["autodocs"],
  parameters: { layout: "centered", docs: { description: { component: "Label gives a form control a visible, clickable name. Connect htmlFor to the control ID and also mark required fields with the native required prop. Use StatusText for help or validation, not as a replacement label. The current size inherits surrounding typography for compatibility; sm, md and lg are the canonical field sizes." } } },
  argTypes: {
    children: { control: "text" },
    size: { control: "select", options: ["sm", "md", "lg", "current"] },
    required: { control: "boolean" }, disabled: { control: "boolean" },
    htmlFor: { control: false }, ref: { control: false },
  },
  args: { children: "Full name", size: "md", required: false, disabled: false },
} satisfies Meta<typeof Label>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  parameters: { docs: { description: { story: "Change the label copy, size and required or disabled state, then click the label to focus its associated field." } } },
  render: (args) => <LabeledField {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByText("Full name"))
    await expect(canvas.getByRole("textbox")).toHaveFocus()
  },
}

export const Sizes: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story: "Small (sm), Medium (md) and Large (lg) pair labels with matching field and helper sizes. Business keeps Small and Medium labels at the same readable size; Large uses a larger label.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <div className="grid gap-400">
        {([
          ["sm", "Small field (sm)"],
          ["md", "Medium field (md)"],
          ["lg", "Large field (lg)"],
        ] as const).map(([size, label]) => (
          <VariantGroup key={size} title={label}>
            <LabeledField size={size}>Full name</LabeledField>
          </VariantGroup>
        ))}
      </div>
    </VariantContainer>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const headings = canvas.getAllByRole("heading", { level: 3 })
    await expect(headings).toHaveLength(3)

    // Keep adjacent field examples together instead of inheriting the shared
    // matrix's display-sized section margins.
    const maximumGap = Number.parseFloat(getComputedStyle(canvasElement).fontSize) * 3
    for (let index = 1; index < headings.length; index += 1) {
      const previousGroup = headings[index - 1]?.parentElement
      const currentGroup = headings[index]?.parentElement
      if (!(previousGroup && currentGroup)) {
        throw new Error("Each field heading must belong to its example group")
      }
      const previous = previousGroup.getBoundingClientRect()
      const current = currentGroup.getBoundingClientRect()
      await expect(current.top - previous.bottom).toBeLessThanOrEqual(maximumGap)
    }

    const labels = canvas.getAllByText("Full name", { selector: "label" })
    const fields = canvas.getAllByRole("textbox")
    await expect(fields).toHaveLength(labels.length)
    for (const [index, label] of labels.entries()) {
      const field = fields[index]
      if (!field) throw new Error("Every label must have its corresponding field")
      await userEvent.click(label)
      await expect(field).toHaveFocus()
    }
  },
}

export const States: Story = {
  parameters: { controls: { disable: true }, docs: { description: { story: "A required indicator has a spoken text alternative, while a disabled field and label are clearly unavailable." } } },
  render: () => <div className="grid gap-400"><LabeledField required size="md">Full name</LabeledField><LabeledField disabled size="md">Full name</LabeledField></div>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("textbox", { name: "Full name (required)" })).toBeRequired()
    await expect(canvas.getAllByRole("textbox")[1]).toBeDisabled()
  },
}
