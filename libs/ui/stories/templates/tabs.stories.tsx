import type { Meta, StoryObj } from "@storybook/react"

import { TabsTemplate } from "../../src/templates/tabs"

const meta: Meta<typeof TabsTemplate> = {
  title: "Templates/TabsTemplate",
  component: TabsTemplate,
  parameters: {
    layout: "centered",
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
  },
  tags: ["autodocs"],
  argTypes: {
    items: {
      control: "object",
      description:
        "Array of tab items with value, label, content, and optional disabled state",
      table: {
        category: "Content",
      },
    },
    variant: {
      control: "select",
      options: ["default", "line", "solid", "outline"],
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
    fitted: {
      control: "boolean",
      description: "Make tabs fill container width",
      table: {
        category: "Layout",
      },
    },
    justify: {
      control: "select",
      options: ["start", "center", "end"],
      description: "Horizontal alignment of tabs",
      table: {
        category: "Layout",
      },
    },
    orientation: {
      control: "select",
      options: ["horizontal", "vertical"],
      description: "Tab orientation",
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
    defaultValue: {
      control: "text",
      description: "Default active tab value",
      table: {
        category: "State",
      },
    },
    onValueChange: {
      action: "value-changed",
      table: {
        category: "Events",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof TabsTemplate>

const defaultItems = [
  {
    value: "tab1",
    label: "Overview",
    content: (
      <div className="p-400">
        <h3 className="text-lg font-semibold mb-200">Overview</h3>
        <p className="text-fg-secondary">
          This is the overview tab content. It contains general information
          about the product or feature.
        </p>
      </div>
    ),
  },
  {
    value: "tab2",
    label: "Details",
    content: (
      <div className="p-400">
        <h3 className="text-lg font-semibold mb-200">Details</h3>
        <p className="text-fg-secondary">
          Here you'll find detailed specifications and technical information.
        </p>
      </div>
    ),
  },
  {
    value: "tab3",
    label: "Reviews",
    content: (
      <div className="p-400">
        <h3 className="text-lg font-semibold mb-200">Reviews</h3>
        <p className="text-fg-secondary">
          Customer reviews and ratings appear in this section.
        </p>
      </div>
    ),
  },
]

export const Default: Story = {
  args: {
    items: defaultItems,
    variant: "default",
    size: "md",
    fitted: false,
    justify: "start",
    orientation: "horizontal",
    showIndicator: false,
  },
}

export const Playground: Story = {
  name: "🎮 Interactive Playground",
  args: {
    items: [
      ...defaultItems,
      {
        value: "tab4",
        label: "Disabled",
        content: <div className="p-400">This tab is disabled</div>,
        disabled: true,
      },
    ],
    variant: "line",
    size: "md",
    fitted: false,
    justify: "start",
    orientation: "horizontal",
    showIndicator: true,
  },
}
