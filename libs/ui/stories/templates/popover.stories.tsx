import type { Meta, StoryObj } from "@storybook/react"

import { Button } from "../../src/atoms/button"
import { PopoverTemplate } from "../../src/templates/popover"
import type { PopoverTemplateProps } from "../../src/templates/popover"

const meta = {
  argTypes: {
    border: {
      control: "boolean",
    },
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
    shadow: {
      control: "boolean",
    },
    showArrow: {
      control: "boolean",
    },
    showCloseButton: {
      control: "boolean",
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
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
  component: PopoverTemplate,
  parameters: {
    docs: {
      description: {
        component:
          "Convenience template that composes the compound Popover molecule into the common trigger/content/title/description shape.",
      },
    },
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "Templates/Popover",
} satisfies Meta<PopoverTemplateProps>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const WithCloseButton: Story = {
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
  args: {
    showArrow: false,
    title: "No arrow",
    trigger: "Open clean popover",
  },
}
