import type { Meta, StoryObj } from "@storybook/react"
import { useEffect, useId, useState } from "react"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { Label } from "../../src/atoms/label"
import { NumericInputTemplate } from "../../src/templates/numeric-input"

const meta: Meta<typeof NumericInputTemplate> = {
  title: "Templates/NumericInputTemplate",
  component: NumericInputTemplate,
  args: { "aria-label": "Quantity", onChange: fn() },
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "NumericInputTemplate is a ready-to-use number editor with optional adjustment buttons. Use it for compact standalone quantities; choose FormNumericInput for labeled fields with validation or NumericInput for custom anatomy.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    id: { control: false, table: { disable: true } },
    ids: { control: false, table: { disable: true } },
    ref: { control: false, table: { disable: true } },
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

export const Playground: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Adjust the numeric options to explore locale formatting, constraints and interaction states.",
      },
    },
  },
  tags: ["ui-semantic-regression"],
  name: "Playground",
  args: {
    "aria-label": "Quantity",
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
  render(args) {
    const [value, setValue] = useState(args.value ?? args.defaultValue ?? 50)
    useEffect(() => {
      if (args.value !== undefined) {
        setValue(args.value)
      }
    }, [args.value])
    return (
      <NumericInputTemplate
        {...args}
        onChange={(next) => {
          setValue(next)
          args.onChange?.(next)
        }}
        value={value}
      />
    )
  },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("spinbutton", {
      name: "Quantity",
    })
    await userEvent.click(input)
    await userEvent.keyboard("{ArrowUp}")
    await waitFor(() => expect(input).toHaveAttribute("aria-valuenow", "55"))
    await userEvent.keyboard("{ArrowDown}")
    await waitFor(() => expect(input).toHaveAttribute("aria-valuenow", "50"))
    await userEvent.unhover(input)
    input.blur()
    await waitFor(() => {
      expect(input).toHaveAttribute("aria-valuenow", "50")
      expect(input).not.toHaveFocus()
    })
  },
}

export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare the same quantity across Small (sm), Medium (md) and Large (lg).",
      },
    },
  },
  render() {
    const id = useId()
    return (
      <div className="flex w-full max-w-md flex-col gap-300">
        {(
          [
            ["sm", "Small (sm)"],
            ["md", "Medium (md)"],
            ["lg", "Large (lg)"],
          ] as const
        ).map(([size, label]) => (
          <div key={size}>
            <Label htmlFor={`${id}-${size}`} size={size}>
              {label}
            </Label>
            <NumericInputTemplate
              defaultValue={10}
              id={`${id}-${size}`}
              size={size}
            />
          </div>
        ))}
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    for (const name of ["Small (sm)", "Medium (md)", "Large (lg)"]) {
      await userEvent.click(canvas.getByText(name))
      await expect(canvas.getByRole("spinbutton", { name })).toHaveFocus()
    }
  },
}
export const Disabled: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Disabled quantities are unavailable and removed from keyboard navigation.",
      },
    },
  },
  args: { disabled: true, defaultValue: 42 },
}

export const ReadOnly: Story = {
  name: "Read-only",
  parameters: {
    docs: {
      description: {
        story:
          "Read-only quantities remain focusable and selectable while typing, wheel, scrubbing and step actions cannot change the value.",
      },
    },
  },
  args: { readOnly: true, defaultValue: 42, showScrubber: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("spinbutton")
    await userEvent.click(input)
    await expect(input).toHaveFocus()
    await userEvent.paste("Unwanted replacement")
    await userEvent.keyboard("7{ArrowUp}{ArrowDown}{Backspace}{Delete}")
    await expect(input).toHaveValue("42")
    await expect(input).not.toBeDisabled()
    await expect(canvas.queryAllByRole("button")).toHaveLength(0)
  },
}

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A standalone quantity editor starts at zero with standard step buttons.",
      },
    },
  },
  args: {
    "aria-label": "Quantity",
    defaultValue: 0,
    min: 0,
    max: 100,
    step: 1,
    showControls: true,
    size: "md",
  },
}

export const WithExternalLabel: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "An external label names and focuses the real input rather than the decorative root.",
      },
    },
  },
  tags: ["ui-semantic-regression"],
  render: () => (
    <div className="flex flex-col gap-50">
      <Label htmlFor="order-quantity-input" id="order-quantity-label">
        Order quantity
      </Label>
      <NumericInputTemplate
        aria-label="Fallback quantity"
        aria-labelledby="order-quantity-label"
        controlsPosition="sides"
        defaultValue={3}
        id="order-quantity"
        ids={{ input: "order-quantity-input" }}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("spinbutton", { name: "Order quantity" })
    await userEvent.click(canvas.getByText("Order quantity"))
    await expect(input).toHaveFocus()
    await userEvent.keyboard("{ArrowUp}")
    await waitFor(() => expect(input).toHaveAttribute("aria-valuenow", "4"))
  },
}
