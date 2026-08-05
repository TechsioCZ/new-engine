import type { Meta, StoryObj } from "@storybook/react"

import { NumericInputTemplate } from "../../src/templates/numeric-input"

const meta: Meta<typeof NumericInputTemplate> = {
  argTypes: {
    allowMouseWheel: {
      control: "boolean",
      description: "Allow mouse wheel to change value",
      table: {
        category: "Behavior",
      },
    },
    allowOverflow: {
      control: "boolean",
      description: "Allow values outside min/max range",
      table: {
        category: "Behavior",
      },
    },
    clampValueOnBlur: {
      control: "boolean",
      description: "Clamp to min/max on blur",
      table: {
        category: "Behavior",
      },
    },
    controlsPosition: {
      control: "select",
      description: "Position of control buttons",
      options: ["right", "sides"],
      table: {
        category: "Controls",
      },
    },
    defaultValue: {
      control: "number",
      description: "Default value",
      table: {
        category: "Value",
      },
    },
    disabled: {
      control: "boolean",
      description: "Disable the input",
      table: {
        category: "State",
      },
    },
    invalid: {
      control: "boolean",
      description: "Show invalid state",
      table: {
        category: "State",
      },
    },
    max: {
      control: "number",
      description: "Maximum value",
      table: {
        category: "Constraints",
      },
    },
    min: {
      control: "number",
      description: "Minimum value",
      table: {
        category: "Constraints",
      },
    },
    onChange: {
      action: "changed",
      table: {
        category: "Events",
      },
    },
    precision: {
      control: { max: 10, min: 0, type: "number" },
      description: "Number of decimal places",
      table: {
        category: "Constraints",
      },
    },
    readOnly: {
      control: "boolean",
      description: "Make input read-only",
      table: {
        category: "State",
      },
    },
    required: {
      control: "boolean",
      description: "Mark as required field",
      table: {
        category: "State",
      },
    },
    showControls: {
      control: "boolean",
      description: "Show increment/decrement buttons",
      table: {
        category: "Controls",
      },
    },
    showScrubber: {
      control: "boolean",
      description: "Enable drag to change value",
      table: {
        category: "Controls",
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
    spinOnPress: {
      control: "boolean",
      description: "Continuous change on button hold",
      table: {
        category: "Behavior",
      },
    },
    step: {
      control: "number",
      description: "Step increment",
      table: {
        category: "Constraints",
      },
    },
    value: {
      control: "number",
      description: "Current value",
      table: {
        category: "Value",
      },
    },
  },
  component: NumericInputTemplate,
  parameters: {
    docs: {
      description: {
        component: `
          A ready-to-use numeric input template with props-based API.
          This template provides a simplified interface for the NumericInput compound component,
          making it ideal for Storybook controls and rapid prototyping.

          Part of the templates layer in atomic design architecture.
        `,
      },
    },
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "Templates/NumericInputTemplate",
}

export default meta
type Story = StoryObj<typeof NumericInputTemplate>

export const Default: Story = {
  args: {
    defaultValue: 0,
    max: 100,
    min: 0,
    showControls: true,
    size: "md",
    step: 1,
  },
}

export const Playground: Story = {
  args: {
    allowMouseWheel: true,
    clampValueOnBlur: true,
    controlsPosition: "right",
    defaultValue: 50,
    max: 100,
    min: 0,
    showControls: true,
    showScrubber: false,
    size: "md",
    spinOnPress: true,
    step: 5,
  },
  name: "🎮 Interactive Playground",
}
