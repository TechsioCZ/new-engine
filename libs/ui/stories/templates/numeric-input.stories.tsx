import type { Meta, StoryObj } from "@storybook/react"

import { NumericInputTemplate } from "../../src/templates/numeric-input"

const meta: Meta<typeof NumericInputTemplate> = {
  title: "Templates/NumericInputTemplate",
  component: NumericInputTemplate,
  parameters: {
    layout: "centered",
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
  },
  tags: ["autodocs"],
  argTypes: {
    value: {
      control: "number",
      description: "Current value",
      table: {
        category: "Value",
      },
    },
    defaultValue: {
      control: "number",
      description: "Default value",
      table: {
        category: "Value",
      },
    },
    min: {
      control: "number",
      description: "Minimum value",
      table: {
        category: "Constraints",
      },
    },
    max: {
      control: "number",
      description: "Maximum value",
      table: {
        category: "Constraints",
      },
    },
    step: {
      control: "number",
      description: "Step increment",
      table: {
        category: "Constraints",
      },
    },
    precision: {
      control: { type: "number", min: 0, max: 10 },
      description: "Number of decimal places",
      table: {
        category: "Constraints",
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
    controlsPosition: {
      control: "select",
      options: ["right", "sides"],
      description: "Position of control buttons",
      table: {
        category: "Controls",
      },
    },
    disabled: {
      control: "boolean",
      description: "Disable the input",
      table: {
        category: "State",
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
    invalid: {
      control: "boolean",
      description: "Show invalid state",
      table: {
        category: "State",
      },
    },
    allowOverflow: {
      control: "boolean",
      description: "Allow values outside min/max range",
      table: {
        category: "Behavior",
      },
    },
    allowMouseWheel: {
      control: "boolean",
      description: "Allow mouse wheel to change value",
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
    spinOnPress: {
      control: "boolean",
      description: "Continuous change on button hold",
      table: {
        category: "Behavior",
      },
    },
    onChange: {
      action: "changed",
      table: {
        category: "Events",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof NumericInputTemplate>

export const Default: Story = {
  args: {
    defaultValue: 0,
    min: 0,
    max: 100,
    step: 1,
    showControls: true,
    size: "md",
  },
}

export const Playground: Story = {
  name: "🎮 Interactive Playground",
  args: {
    defaultValue: 50,
    min: 0,
    max: 100,
    step: 5,
    showControls: true,
    showScrubber: false,
    controlsPosition: "right",
    size: "md",
    allowMouseWheel: true,
    clampValueOnBlur: true,
    spinOnPress: true,
  },
}
