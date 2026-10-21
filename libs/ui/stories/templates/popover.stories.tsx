import type { Meta, StoryObj } from "@storybook/react"
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
  parameters: { docs: { description: { story: "An explicit close action helps dismiss a short panel without relying on clicking outside." } } },
  args: {
    children: (
      <div className="space-y-200">
        <p className="text-sm">
          Use the close trigger when the content has form-like interaction.
        </p>
        <Button size="sm" variant="secondary">
          Action
        </Button>
      </div>
    ),
    showCloseButton: true,
    title: "Interactive content",
    trigger: "Open form popover",
  },
}

export const WithoutArrow: Story = {
  parameters: { docs: { description: { story: "Omit the arrow for a simpler panel while retaining its anchored positioning." } } },
  args: {
    showArrow: false,
    title: "No arrow",
    trigger: "Open clean popover",
  },
}
