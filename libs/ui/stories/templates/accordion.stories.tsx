import type { Meta, StoryObj } from "@storybook/react"
import { fn } from "storybook/test"
import { AccordionTemplate } from "../../src/templates/accordion"

const meta: Meta<typeof AccordionTemplate> = {
  title: "Templates/AccordionTemplate",
  component: AccordionTemplate,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A data-driven accordion for FAQs and secondary reference content. Provide an items array for a compact API; use the Accordion molecule when you need custom headers, badges, or detailed compound anatomy. Keep essential information visible rather than hiding it in disclosures.",
      },
    },
  },
  tags: ["autodocs"],
  args: { onChange: fn() },
  decorators: [
    (Story) => (
      <div className="w-full max-w-lg">
        <Story />
      </div>
    ),
  ],
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
      control: false,
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
    content:
      "We offer a 30-day return policy on all items. Items must be unused and in their original packaging. Shipping costs are non-refundable unless the item is defective.",
  },
  {
    value: "item2",
    title: "How long does shipping take?",
    content:
      "Standard shipping typically takes 5-7 business days. Express shipping options are available at checkout for delivery within 2-3 business days.",
  },
  {
    value: "item3",
    title: "Do you ship internationally?",
    content:
      "Yes, we ship to most countries worldwide. International shipping times vary by destination and typically range from 10-21 business days.",
  },
]

export const Playground: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Adjust items, sizing, and disclosure behavior through Controls to preview a data-driven FAQ with an open answer and an explained unavailable option.",
      },
    },
  },
  args: {
    items: [
      ...defaultItems,
      {
        value: "item4",
        title: "Can I track my order?",
        content:
          "Yes! Once your order ships, you'll receive a tracking number via email. You can use this number to track your package on our website or the carrier's site.",
      },
      {
        value: "item5",
        title: "Warehouse collection (unavailable during maintenance)",
        content:
          "Collection will resume when warehouse maintenance is complete.",
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

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Render a concise delivery and returns FAQ from data so teams can add reference sections without repeating compound markup.",
      },
    },
  },
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
