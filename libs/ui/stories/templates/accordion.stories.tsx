import type { Meta, StoryObj } from "@storybook/react"

import { AccordionTemplate } from "../../src/templates/accordion"

const meta: Meta<typeof AccordionTemplate> = {
  title: "Templates/AccordionTemplate",
  component: AccordionTemplate,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
          A ready-to-use accordion template with props-based API.
          This template provides a simplified interface for the Accordion compound component,
          making it ideal for Storybook controls and rapid prototyping.

          Part of the templates layer in atomic design architecture.
        `,
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    items: {
      control: "object",
      description:
        "Array of accordion items with value, title, content, and optional disabled state",
      table: {
        category: "Content",
      },
    },
    variant: {
      control: "select",
      options: ["default", "borderless", "child"],
      description: "Visual style variant",
      table: {
        category: "Appearance",
      },
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "Size variant",
      table: {
        category: "Appearance",
      },
    },
    shadow: {
      control: "select",
      options: ["sm", "md", "none"],
      description: "Shadow style",
      table: {
        category: "Appearance",
      },
    },
    showIndicator: {
      control: "boolean",
      description: "Show expand/collapse indicator icon",
      table: {
        category: "Appearance",
      },
    },
    collapsible: {
      control: "boolean",
      description: "Allow all items to be collapsed",
      table: {
        category: "Behavior",
      },
    },
    multiple: {
      control: "boolean",
      description: "Allow multiple items to be expanded",
      table: {
        category: "Behavior",
      },
    },
    onChange: {
      action: "value-changed",
      table: {
        category: "Events",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof AccordionTemplate>

const defaultItems = [
  {
    value: "item1",
    title: "What is your return policy?",
    content: (
      <p className="text-fg-secondary">
        We offer a 30-day return policy on all items. Items must be unused and
        in their original packaging. Shipping costs are non-refundable unless
        the item is defective.
      </p>
    ),
  },
  {
    value: "item2",
    title: "How long does shipping take?",
    content: (
      <p className="text-fg-secondary">
        Standard shipping typically takes 5-7 business days. Express shipping
        options are available at checkout for delivery within 2-3 business days.
      </p>
    ),
  },
  {
    value: "item3",
    title: "Do you ship internationally?",
    content: (
      <p className="text-fg-secondary">
        Yes, we ship to most countries worldwide. International shipping times
        vary by destination and typically range from 10-21 business days.
      </p>
    ),
  },
]

export const Default: Story = {
  args: {
    items: defaultItems,
    variant: "default",
    size: "md",
    shadow: "none",
    collapsible: true,
    multiple: false,
    showIndicator: true,
  },
}

export const Playground: Story = {
  name: "🎮 Interactive Playground",
  args: {
    items: [
      ...defaultItems,
      {
        value: "item4",
        title: "Can I track my order?",
        content: (
          <p className="text-fg-secondary">
            Yes! Once your order ships, you'll receive a tracking number via
            email. You can use this number to track your package on our website
            or the carrier's site.
          </p>
        ),
      },
      {
        value: "item5",
        title: "Disabled Item",
        content: <p className="text-fg-secondary">This item is disabled</p>,
        disabled: true,
      },
    ],
    variant: "default",
    size: "md",
    shadow: "none",
    collapsible: true,
    multiple: true,
    showIndicator: true,
    defaultValue: ["item1"],
  },
}
