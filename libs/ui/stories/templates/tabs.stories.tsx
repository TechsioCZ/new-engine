import type { Meta, StoryObj } from "@storybook/react"

import { TabsTemplate } from "../../src/templates/tabs"

const meta: Meta<typeof TabsTemplate> = {
  argTypes: {
    defaultValue: {
      control: "text",
      description: "Default active tab value",
      table: {
        category: "State",
      },
    },
    fitted: {
      control: "boolean",
      description: "Make tabs fill container width",
      table: {
        category: "Layout",
      },
    },
    items: {
      control: "object",
      description:
        "Array of tab items with value, label, content, and optional disabled state",
      table: {
        category: "Content",
      },
    },
    justify: {
      control: "select",
      description: "Horizontal alignment of tabs",
      options: ["start", "center", "end"],
      table: {
        category: "Layout",
      },
    },
    onValueChange: {
      action: "value-changed",
      table: {
        category: "Events",
      },
    },
    orientation: {
      control: "select",
      description: "Tab orientation",
      options: ["horizontal", "vertical"],
      table: {
        category: "Layout",
      },
    },
    showIndicator: {
      control: "boolean",
      description: "Show visual indicator for active tab",
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
      options: ["default", "line", "solid", "outline"],
      table: {
        category: "Appearance",
      },
    },
  },
  component: TabsTemplate,
  parameters: {
    docs: {
      description: {
        component: `
          A ready-to-use tabs template with props-based API.
          This template provides a simplified interface for the Tabs compound component,
          making it ideal for Storybook controls and rapid prototyping.

          Part of the templates layer in atomic design architecture.
        `,
      },
    },
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "Templates/TabsTemplate",
}

export default meta
type Story = StoryObj<typeof TabsTemplate>

const defaultItems = [
  {
    content: (
      <div className="p-400">
        <h3 className="text-lg font-semibold mb-200">Overview</h3>
        <p className="text-fg-secondary">
          This is the overview tab content. It contains general information
          about the product or feature.
        </p>
      </div>
    ),
    label: "Overview",
    value: "tab1",
  },
  {
    content: (
      <div className="p-400">
        <h3 className="text-lg font-semibold mb-200">Details</h3>
        <p className="text-fg-secondary">
          Here you'll find detailed specifications and technical information.
        </p>
      </div>
    ),
    label: "Details",
    value: "tab2",
  },
  {
    content: (
      <div className="p-400">
        <h3 className="text-lg font-semibold mb-200">Reviews</h3>
        <p className="text-fg-secondary">
          Customer reviews and ratings appear in this section.
        </p>
      </div>
    ),
    label: "Reviews",
    value: "tab3",
  },
]

export const Default: Story = {
  args: {
    fitted: false,
    items: defaultItems,
    justify: "start",
    orientation: "horizontal",
    showIndicator: false,
    size: "md",
    variant: "default",
  },
}

export const Playground: Story = {
  args: {
    fitted: false,
    items: [
      ...defaultItems,
      {
        content: <div className="p-400">This tab is disabled</div>,
        disabled: true,
        label: "Disabled",
        value: "tab4",
      },
    ],
    justify: "start",
    orientation: "horizontal",
    showIndicator: true,
    size: "md",
    variant: "line",
  },
  name: "🎮 Interactive Playground",
}
