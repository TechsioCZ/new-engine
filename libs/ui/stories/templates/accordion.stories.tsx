import type { Meta, StoryObj } from "@storybook/react"

import { AccordionTemplate } from "../../src/templates/accordion"

const meta: Meta<typeof AccordionTemplate> = {
  argTypes: {
    collapsible: {
      control: "boolean",
      description: "Allow all items to be collapsed",
      table: {
        category: "Behavior",
      },
    },
    items: {
      control: "object",
      description:
        "Array of accordion items with value, title, content, and optional disabled state",
      table: {
        category: "Content",
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
    shadow: {
      control: "select",
      description: "Shadow style",
      options: ["sm", "md", "none"],
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
    size: {
      control: "select",
      description: "Size variant",
      options: ["sm", "md", "lg"],
      table: {
        category: "Appearance",
      },
    },
    variant: {
      control: "select",
      description: "Visual style variant",
      options: ["default", "borderless", "child"],
      table: {
        category: "Appearance",
      },
    },
  },
  component: AccordionTemplate,
  parameters: {
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
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "Templates/AccordionTemplate",
}

export default meta
type Story = StoryObj<typeof AccordionTemplate>

const defaultItems = [
  {
    content: (
      <p className="text-fg-secondary">
        We offer a 30-day return policy on all items. Items must be unused and
        in their original packaging. Shipping costs are non-refundable unless
        the item is defective.
      </p>
    ),
    title: "What is your return policy?",
    value: "item1",
  },
  {
    content: (
      <p className="text-fg-secondary">
        Standard shipping typically takes 5-7 business days. Express shipping
        options are available at checkout for delivery within 2-3 business days.
      </p>
    ),
    title: "How long does shipping take?",
    value: "item2",
  },
  {
    content: (
      <p className="text-fg-secondary">
        Yes, we ship to most countries worldwide. International shipping times
        vary by destination and typically range from 10-21 business days.
      </p>
    ),
    title: "Do you ship internationally?",
    value: "item3",
  },
]

export const Default: Story = {
  args: {
    collapsible: true,
    items: defaultItems,
    multiple: false,
    shadow: "none",
    showIndicator: true,
    size: "md",
    variant: "default",
  },
}

export const Playground: Story = {
  args: {
    collapsible: true,
    defaultValue: ["item1"],
    items: [
      ...defaultItems,
      {
        content: (
          <p className="text-fg-secondary">
            Yes! Once your order ships, you&apos;ll receive a tracking number
            via email. You can use this number to track your package on our
            website or the carrier&apos;s site.
          </p>
        ),
        title: "Can I track my order?",
        value: "item4",
      },
      {
        content: <p className="text-fg-secondary">This item is disabled</p>,
        disabled: true,
        title: "Disabled Item",
        value: "item5",
      },
    ],
    multiple: true,
    shadow: "none",
    showIndicator: true,
    size: "md",
    variant: "default",
  },
  name: "🎮 Interactive Playground",
}
