import type { Meta, StoryObj } from "@storybook/react"
import { useId, useState } from "react"
import { expect, userEvent, within } from "storybook/test"
import { Input } from "../../src/atoms/input"
import { Label } from "../../src/atoms/label"
import { StatusText } from "../../src/atoms/status-text"
import { Button } from "../../src/atoms/button"
import {
  PopoverTemplate,
  type PopoverTemplateProps,
} from "../../src/templates/popover"

const meta = {
  title: "Templates/Popover",
  component: PopoverTemplate,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Convenience template that composes the compound Popover molecule into the common trigger/content/title/description shape. Use it for quick anchored tasks; use the compound Popover for custom composition and Dialog for longer workflows.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    placement: {
      control: "select",
      options: [
        "top",
        "bottom",
        "left",
        "right",
        "top-start",
        "top-end",
        "bottom-start",
        "bottom-end",
        "left-start",
        "left-end",
        "right-start",
        "right-end",
      ],
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
    border: {
      control: "boolean",
    },
    shadow: {
      control: "boolean",
    },
    showArrow: {
      control: "boolean",
    },
    showCloseButton: {
      control: "boolean",
    },
  },
  args: {
    border: true,
    children: <p className="text-sm">Popover content.</p>,
    description: "Short supporting text for the popover.",
    placement: "bottom",
    shadow: true,
    showArrow: true,
    showCloseButton: false,
    size: "md",
    title: "Popover title",
    trigger: "Open popover",
  },
} satisfies Meta<PopoverTemplateProps>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = { parameters: { docs: { description: { story: "Use Controls to adjust the template surface, size, placement and content." } } } }

export const Sizes: Story = {
  parameters: { controls: { disable: true }, docs: { description: { story: "The template forwards Small (sm), Medium (md) and Large (lg) panel density without changing the delivery content." } } },
  render: () => <div className="flex flex-wrap gap-400">{([["sm", "Small (sm)"], ["md", "Medium (md)"], ["lg", "Large (lg)"]] as const).map(([size, label]) => <section key={size} className="space-y-200"><h3 className="font-semibold text-sm">{label}</h3><PopoverTemplate title="Delivery details" trigger="Delivery details" size={size}><p>Standard delivery takes 2–4 business days.</p></PopoverTemplate></section>)}</div>,
}
export const WithCloseButton: Story = {
  parameters: { controls: { disable: true }, docs: { description: { story: "A short delivery-contact form saves locally and offers both Cancel and a persistent close control." } } },
  render: () => {
    const id = useId()
    const [open, setOpen] = useState(false)
    const [saved, setSaved] = useState(false)
    return <div className="space-y-200"><PopoverTemplate title="Delivery contact" trigger="Edit delivery contact" showCloseButton open={open} onOpenChange={({ open }) => setOpen(open)}>
      <form className="space-y-200" onSubmit={(event) => { event.preventDefault(); setSaved(true); setOpen(false) }}>
        <Label htmlFor={id} size="sm" required>Full name</Label><Input id={id} size="sm" defaultValue="Mara Nováková" required />
        <div className="flex justify-end gap-100"><Button size="sm" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button size="sm" type="submit">Save contact</Button></div>
      </form>
    </PopoverTemplate>{saved && <StatusText status="success">Delivery contact saved for this preview.</StatusText>}</div>
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(canvas.getByRole("button", { name: "Edit delivery contact" }))
    const panel = await body.findByRole("dialog", { name: "Delivery contact" })
    await userEvent.click(within(panel).getByRole("button", { name: "Save contact" }))
    await expect(await canvas.findByRole("status")).toHaveTextContent("Delivery contact saved")
  },
}

export const States: Story = {
  parameters: { docs: { description: { story: "A disabled template trigger cannot open or enter the keyboard tab order." } } },
  args: { disabled: true, trigger: "Delivery details unavailable" },
  play: async ({ canvasElement }) => { await expect(within(canvasElement).getByRole("button", { name: "Delivery details unavailable" })).toBeDisabled() },
}

export const WithoutArrow: Story = {
  parameters: { docs: { description: { story: "Omit the arrow for a simpler panel while retaining its anchored positioning." } } },
  args: {
    showArrow: false,
    title: "No arrow",
    trigger: "Open clean popover",
  },
}
