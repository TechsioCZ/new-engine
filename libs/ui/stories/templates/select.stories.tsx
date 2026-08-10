import type { Meta, StoryObj } from "@storybook/react"
import type { ComponentProps } from "react"

import type { SelectItem } from "../../src/molecules/select"
import { SelectTemplate } from "../../src/templates/select"

const selectSizes: NonNullable<
  ComponentProps<typeof SelectTemplate>["size"]
>[] = ["xs", "sm", "md", "lg"]

const defaultItems: SelectItem[] = [
  { label: "Czech Republic", value: "cz" },
  { label: "Germany", value: "de" },
  { label: "France", value: "fr" },
  { label: "Poland", value: "pl" },
]

const meta: Meta<typeof SelectTemplate> = {
  argTypes: {
    disabled: {
      control: "boolean",
      description: "Disable the select",
      table: {
        category: "State",
      },
    },
    items: {
      control: "object",
      description: "Array of select items",
      table: {
        category: "Content",
      },
    },
    label: {
      control: "text",
      description: "Select label text",
      table: {
        category: "Content",
      },
    },
    onValueChange: {
      action: "value-changed",
      table: {
        category: "Events",
      },
    },
    placeholder: {
      control: "text",
      description: "Placeholder text when no value is selected",
      table: {
        category: "Content",
      },
    },
    required: {
      control: "boolean",
      description: "Mark as required field",
      table: {
        category: "State",
      },
    },
    showIndicator: {
      control: "boolean",
      description: "Show selection indicator for items",
      table: {
        category: "Appearance",
      },
    },
    size: {
      control: "select",
      description: "Size variant",
      options: ["xs", "sm", "md", "lg"],
      table: {
        category: "Appearance",
      },
    },
    validateStatus: {
      control: "select",
      description: "Validation status styling",
      options: ["default", "error", "success", "warning"],
      table: {
        category: "State",
      },
    },
  },
  component: SelectTemplate,
  parameters: {
    docs: {
      description: {
        component: `
          A ready-to-use select template with props-based API.
          This template provides a simplified interface for the Select compound component,
          making it ideal for Storybook controls and rapid prototyping.

          Part of the templates layer in atomic design architecture.
        `,
      },
    },
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "Templates/SelectTemplate",
}

export default meta
type Story = StoryObj<typeof SelectTemplate>

export const Playground: Story = {
  args: {
    items: [...defaultItems, { disabled: true, label: "Spain", value: "es" }],
    label: "Country",
    placeholder: "Select a country",
    size: "md",
  },
  name: "🎮 Interactive Playground",
}

export const Default: Story = {
  args: {
    defaultValue: ["cz"],
    items: defaultItems,
    label: "Country",
    placeholder: "Select a country",
    size: "md",
  },
}

export const Sizes: Story = {
  render: () => (
    <div className="flex w-full max-w-sm flex-col gap-300">
      {selectSizes.map((size) => (
        <SelectTemplate
          defaultValue={["cz"]}
          items={defaultItems}
          key={size}
          label={`Size ${size.toUpperCase()}`}
          placeholder="Select a country"
          size={size}
        />
      ))}
    </div>
  ),
}

export const States: Story = {
  render: () => (
    <div className="flex w-full max-w-sm flex-col gap-300">
      <SelectTemplate
        items={defaultItems}
        label="Default"
        placeholder="Select a country"
        size="md"
      />
      <SelectTemplate
        disabled
        items={defaultItems}
        label="Disabled"
        placeholder="Select a country"
        size="md"
      />
      <SelectTemplate
        items={defaultItems}
        label="Error"
        placeholder="Select a country"
        size="md"
        validateStatus="error"
      />
      <SelectTemplate
        items={defaultItems}
        label="Success"
        placeholder="Select a country"
        size="md"
        validateStatus="success"
      />
    </div>
  ),
}
