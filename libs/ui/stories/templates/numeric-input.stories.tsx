import type { Meta, StoryObj } from "@storybook/react"
import { useEffect, useId, useState } from "react"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { Label } from "../../src/atoms/label"
import { StatusText } from "../../src/atoms/status-text"
import { NumericInputTemplate } from "../../src/templates/numeric-input"

const meta: Meta<typeof NumericInputTemplate> = {
  title: "Templates/NumericInputTemplate",
  component: NumericInputTemplate,
  args: { "aria-label": "Quantity", onChange: fn() },
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `NumericInputTemplate is a ready-to-use number editor with optional adjustment buttons. Use it for compact standalone quantities; choose FormNumericInput for labeled fields with validation or NumericInput for custom anatomy.

### Values and callbacks

\`value\` and \`defaultValue\` accept \`number | string\`. Playground's numeric Controls demonstrate compatibility mode. For editable empty/partial drafts, retain string state as shown in Controlled Draft.

- \`onChange\` receives a number for numeric compatibility; clearing can emit NaN. Never stringify it back into an editable draft.
- \`onValueChange\` receives details: \`details.value\` is the editable string; \`details.valueAsNumber\` is parsed numeric data and may be NaN.
- \`onValueCommit\` receives details on blur/Enter confirmation, not persistence. The application still validates and saves.

\`clampValueOnBlur\` defaults to true; pass false to retain out-of-range drafts. Zag can normalize incomplete fragments on blur/Enter. See [NumericInput's draft guidance](?path=/docs/atoms-numericinput--docs) for the underlying compound API.`,
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
      description:
        "Controlled number or string draft. Numeric Controls demonstrate compatibility mode; use onValueChange/details.value to preserve editable text.",
      table: {
        category: "Value",
      },
    },
    defaultValue: {
      control: "number",
      description:
        "Initial uncontrolled number or string. String drafts are supported; numeric Controls demonstrate the numeric mode.",
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
    onValueChange: {
      control: false,
      description:
        "Full Zag details: details.value preserves the string draft; details.valueAsNumber is parsed data and can be NaN. See NumericInput usage guidance for draft and commit policies.",
      table: { category: "Events", disable: false },
    },
    onChange: {
      action: "changed",
      control: false,
      description:
        "Numeric compatibility callback (value: number) => void; clearing can emit NaN. Do not convert this back into an editable draft.",
      table: {
        category: "Events",
        disable: false,
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
        onValueChange={(details) => {
          setValue(details.value)
          args.onValueChange?.(details)
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
    controls: { disable: true },
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
export const States: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Compare editable, unavailable, read-only and invalid quantities, including the outward-disabled stepper at each bound.",
      },
    },
  },
  render() {
    const id = useId()
    return (
      <div className="flex w-full max-w-md flex-col gap-300">
        {(
          [
            { label: "Editable quantity", value: 3 },
            { label: "Unavailable quantity", value: 3, disabled: true },
            { label: "Read-only quantity", value: 3, readOnly: true },
            { label: "Invalid quantity", value: 12, invalid: true },
            { label: "Minimum quantity", value: 1 },
            { label: "Maximum quantity", value: 10 },
          ] as const
        ).map((item, index) => {
          const inputId = `${id}-${index}`
          const invalid = "invalid" in item && item.invalid
          return (
            <div key={item.label} className="flex flex-col gap-form-field-gap">
              <Label htmlFor={inputId}>{item.label}</Label>
              <NumericInputTemplate
                id={inputId}
                defaultValue={item.value}
                disabled={"disabled" in item && item.disabled}
                readOnly={"readOnly" in item && item.readOnly}
                invalid={invalid}
                describedBy={`${inputId}-help`}
                aria-errormessage={invalid ? `${inputId}-help` : undefined}
                min={1}
                max={10}
                clampValueOnBlur={false}
              />
              <StatusText
                id={`${inputId}-help`}
                status={invalid ? "error" : "default"}
              >
                {invalid
                  ? "Enter a quantity between 1 and 10 before ordering."
                  : "Order 1–10 pieces; only the outward stepper stops at a limit."}
              </StatusText>
            </div>
          )
        })}
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const invalid = canvas.getByRole("spinbutton", { name: "Invalid quantity" })
    await expect(invalid).toHaveAttribute("aria-invalid", "true")
    await expect(invalid).toHaveAccessibleDescription(
      "Enter a quantity between 1 and 10 before ordering."
    )
    await expect(invalid.getAttribute("aria-errormessage")).toBeTruthy()
    for (const [label, outward, inward] of [
      ["Minimum quantity", "decrement-trigger", "increment-trigger"],
      ["Maximum quantity", "increment-trigger", "decrement-trigger"],
    ]) {
      const input = canvas.getByRole("spinbutton", { name: label })
      const control = input.parentElement
      await expect(
        control?.querySelector(`[data-part="${outward}"]`)
      ).toBeDisabled()
      await expect(
        control?.querySelector(`[data-part="${inward}"]`)
      ).not.toBeDisabled()
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
    controls: { disable: true },
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

export const ControlledDraft: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "String state and onValueChange preserve clearing and continued editing while focused; clampValueOnBlur=false retains overflow, while Zag may normalize partial fragments on blur/Enter.",
      },
    },
  },
  render() {
    const [draft, setDraft] = useState("2")
    return (
      <div className="flex flex-col gap-100">
        <NumericInputTemplate
          aria-label="Quantity draft"
          value={draft}
          onValueChange={({ value }) => setDraft(value)}
          clampValueOnBlur={false}
          formatOptions={{ maximumFractionDigits: 2 }}
          locale="en-US"
        />
        <StatusText>Draft: {draft || "(empty)"}</StatusText>
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("spinbutton", { name: "Quantity draft" })
    await userEvent.clear(input)
    await waitFor(() => expect(input).toHaveValue(""))
    await expect(canvas.getByText("Draft: (empty)")).toBeVisible()
    await userEvent.type(input, "3.")
    await waitFor(() => expect(input).toHaveValue("3."))
    await userEvent.type(input, "5")
    await waitFor(() => expect(input).toHaveValue("3.5"))
  },
}

export const NumericCompatibility: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Existing numeric callback consumers can clear and retype without exposing NaN/Infinity as text; new draft forms should use onValueChange instead.",
      },
    },
  },
  render() {
    const [value, setValue] = useState(2)
    return (
      <NumericInputTemplate
        aria-label="Numeric compatibility quantity"
        value={value}
        onChange={setValue}
        min={1}
        max={10}
      />
    )
  },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("spinbutton", {
      name: "Numeric compatibility quantity",
    })
    await userEvent.clear(input)
    await waitFor(() => expect(input).toHaveValue(""))
    await userEvent.type(input, "4")
    await waitFor(() => expect(input).toHaveValue("4"))
    await userEvent.tab()
    await expect(input).toHaveValue("4")
  },
}
