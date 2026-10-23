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
  parameters: { controls: { disable: true }, docs: { description: { story: "Small (sm), Medium (md) and Large (lg) pair identical labels and values with quieter helper text at each size." } } },
  render: () => <VariantContainer>{([["sm", "Small (sm)"], ["md", "Medium (md)"], ["lg", "Large (lg)"]] as const).map(([size, label]) => <VariantGroup key={size} title={label}><LabeledField size={size}>Full name</LabeledField></VariantGroup>)}</VariantContainer>,
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
