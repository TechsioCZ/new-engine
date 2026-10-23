import type { Meta, StoryObj } from "@storybook/react"
import { useId, useState } from "react"
import { expect, fn, userEvent, within } from "storybook/test"
import { Button } from "../../src/atoms/button"
import { NumericInput } from "../../src/atoms/numeric-input"
import { StatusText } from "../../src/atoms/status-text"
import { FormNumericInput } from "../../src/molecules/form-numeric-input"

const meta: Meta<typeof FormNumericInput> = {
  title: "Molecules/FormNumericInput",
  component: FormNumericInput,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "FormNumericInput combines a visible label, a numeric editor and associated validation feedback for quantities, prices and measurements. Choose NumericInput for custom compact compositions or FormInput for numeric identifiers.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    id: { control: false, table: { disable: true } },
    ids: { control: false, table: { disable: true } },
    ref: { control: false, table: { disable: true } },
    // Text inputs
    label: {
      control: "text",
      description: "Label for the numeric input",
    },
    helpText: {
      control: "text",
      description: "Help text displayed below the input",
    },

    // Appearance
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "Size of the numeric input",
      table: { defaultValue: { summary: "md" } },
    },
    validateStatus: {
      control: "select",
      options: ["default", "error", "success", "warning"],
      description: "Validation status of the numeric input",
      table: { defaultValue: { summary: "default" } },
    },
    showHelpTextIcon: {
      control: "boolean",
      description:
        'Whether to show an icon with the help text. Defaults to true when validateStatus is not "default".',
      table: { defaultValue: { summary: "auto (true when validated)" } },
    },

    // States
    disabled: {
      control: "boolean",
      description: "Disable the numeric input",
      table: { defaultValue: { summary: "false" } },
    },
    required: {
      control: "boolean",
      description: "Mark as required field",
      table: { defaultValue: { summary: "false" } },
    },

    // Numeric options
    min: {
      control: "number",
      description: "Minimum allowed value",
    },
    max: {
      control: "number",
      description: "Maximum allowed value",
    },
    step: {
      control: "number",
      description: "Step increment value",
      table: { defaultValue: { summary: "1" } },
    },
    precision: {
      control: "number",
      description: "Number of decimal places",
    },

    // Behavior
    allowMouseWheel: {
      control: "boolean",
      description: "Allow changing value with mouse wheel",
      table: { defaultValue: { summary: "true" } },
    },
    allowOverflow: {
      control: "boolean",
      description: "Allow values outside min/max range",
      table: { defaultValue: { summary: "false" } },
    },
    clampValueOnBlur: {
      control: "boolean",
      description: "Clamp value to min/max when input loses focus",
      table: { defaultValue: { summary: "true" } },
    },
    spinOnPress: {
      control: "boolean",
      description: "Continue incrementing/decrementing while button is held",
      table: { defaultValue: { summary: "true" } },
    },
    readOnly: {
      control: "boolean",
      description: "Make input read-only",
      table: { defaultValue: { summary: "false" } },
    },
    locale: {
      control: "text",
      description: "Locale for number formatting",
      table: { defaultValue: { summary: "cs-CZ" } },
    },
  },
  args: {
    label: "Quantity",
    helpText: "Enter a value between 0 and 100",
    size: "md",
    validateStatus: "default",
    showHelpTextIcon: true,
    disabled: false,
    required: false,
    readOnly: false,
    min: 0,
    max: 100,
    step: 1,
    allowMouseWheel: true,
    allowOverflow: false,
    clampValueOnBlur: true,
    spinOnPress: true,
    locale: "cs-CZ",
  },
}

export default meta
type Story = StoryObj<typeof FormNumericInput>

// Playground - Interactive with Controls
const formDraftChanged = fn()
const formDraftCommitted = fn()
const formNumericChanged = fn()

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
  args: {
    label: "Playground NumericInput",
  },
  render: (args) => (
    <div className="w-full max-w-md">
      <FormNumericInput defaultValue={50} {...args}>
        <NumericInput.Control>
          <NumericInput.Input />
          <NumericInput.TriggerContainer>
            <NumericInput.IncrementTrigger />
            <NumericInput.DecrementTrigger />
          </NumericInput.TriggerContainer>
        </NumericInput.Control>
      </FormNumericInput>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("spinbutton", {
      name: "Playground NumericInput",
    })
    const label = canvas.getByText("Playground NumericInput")
    await expect(input).toHaveAccessibleDescription(
      "Enter a value between 0 and 100"
    )
    await userEvent.click(label)
    await expect(input).toHaveFocus()
    await userEvent.unhover(label)
    input.blur()
    await expect(input).not.toHaveFocus()
  },
}

// With Error - Shows validation error state
export const ValidationStates: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Neutral guidance and error, warning and success feedback pair text with appropriate status icons.",
      },
    },
  },
  render: () => {
    const [value1, setValue1] = useState(25)
    const [value2, setValue2] = useState(50)
    const [value3, setValue3] = useState(75)
    const [value4, setValue4] = useState(100)

    return (
      <div className="flex flex-col gap-300">
        <div className="w-full max-w-md">
          <FormNumericInput
            helpText="Enter a value between 0 and 100"
            label="Default State"
            max={100}
            min={0}
            onChange={setValue1}
            value={value1}
          >
            <NumericInput.Control>
              <NumericInput.Input />
              <NumericInput.TriggerContainer>
                <NumericInput.IncrementTrigger />
                <NumericInput.DecrementTrigger />
              </NumericInput.TriggerContainer>
            </NumericInput.Control>
          </FormNumericInput>
        </div>

        <div className="w-full max-w-md">
          <FormNumericInput
            helpText="Value must be between 0 and 100"
            label="Error State"
            max={100}
            min={0}
            onChange={setValue2}
            validateStatus="error"
            value={value2}
          >
            <NumericInput.Control>
              <NumericInput.Input />
              <NumericInput.TriggerContainer>
                <NumericInput.IncrementTrigger />
                <NumericInput.DecrementTrigger />
              </NumericInput.TriggerContainer>
            </NumericInput.Control>
          </FormNumericInput>
        </div>

        <div className="w-full max-w-md">
          <FormNumericInput
            helpText="Quantity is valid"
            label="Success State"
            max={100}
            min={0}
            onChange={setValue3}
            validateStatus="success"
            value={value3}
          >
            <NumericInput.Control>
              <NumericInput.Input />
              <NumericInput.TriggerContainer>
                <NumericInput.IncrementTrigger />
                <NumericInput.DecrementTrigger />
              </NumericInput.TriggerContainer>
            </NumericInput.Control>
          </FormNumericInput>
        </div>

        <div className="w-full max-w-md">
          <FormNumericInput
            helpText="Quantity is at maximum limit"
            label="Warning State"
            max={100}
            min={0}
            onChange={setValue4}
            validateStatus="warning"
            value={value4}
          >
            <NumericInput.Control>
              <NumericInput.Input />
              <NumericInput.TriggerContainer>
                <NumericInput.IncrementTrigger />
                <NumericInput.DecrementTrigger />
              </NumericInput.TriggerContainer>
            </NumericInput.Control>
          </FormNumericInput>
        </div>
      </div>
    )
  },
}

// Required Field
export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Small (sm), Medium (md) and Large (lg) show the same quantity in the canonical size order.",
      },
    },
  },
  render: () => {
    const [value1, setValue1] = useState(10)
    const [value2, setValue2] = useState(10)
    const [value3, setValue3] = useState(10)

    return (
      <div className="flex flex-col gap-300">
        <div className="w-full max-w-md">
          <FormNumericInput
            label="Small (sm)"
            max={100}
            min={0}
            onChange={setValue1}
            size="sm"
            value={value1}
          >
            <NumericInput.Control>
              <NumericInput.Input />
              <NumericInput.TriggerContainer>
                <NumericInput.IncrementTrigger />
                <NumericInput.DecrementTrigger />
              </NumericInput.TriggerContainer>
            </NumericInput.Control>
          </FormNumericInput>
        </div>

        <div className="w-full max-w-md">
          <FormNumericInput
            label="Medium (md)"
            max={100}
            min={0}
            onChange={setValue2}
            size="md"
            value={value2}
          >
            <NumericInput.Control>
              <NumericInput.Input />
              <NumericInput.TriggerContainer>
                <NumericInput.IncrementTrigger />
                <NumericInput.DecrementTrigger />
              </NumericInput.TriggerContainer>
            </NumericInput.Control>
          </FormNumericInput>
        </div>

        <div className="w-full max-w-md">
          <FormNumericInput
            label="Large (lg)"
            max={100}
            min={0}
            onChange={setValue3}
            size="lg"
            value={value3}
          >
            <NumericInput.Control>
              <NumericInput.Input />
              <NumericInput.TriggerContainer>
                <NumericInput.IncrementTrigger />
                <NumericInput.DecrementTrigger />
              </NumericInput.TriggerContainer>
            </NumericInput.Control>
          </FormNumericInput>
        </div>
      </div>
    )
  },
}

// With Precision - Decimal values
export const Disabled: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Unavailable quantities leave the tab order and cannot be adjusted.",
      },
    },
  },
  render: () => (
    <div className="w-full max-w-md">
      <FormNumericInput
        defaultValue={42}
        disabled
        helpText="This field is disabled"
        label="Quantity"
      >
        <NumericInput.Control>
          <NumericInput.Input />
          <NumericInput.TriggerContainer>
            <NumericInput.IncrementTrigger />
            <NumericInput.DecrementTrigger />
          </NumericInput.TriggerContainer>
        </NumericInput.Control>
      </FormNumericInput>
    </div>
  ),
}

// Horizontal Layout - Triggers beside input

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
  render: () => (
    <div className="w-full max-w-md">
      <FormNumericInput
        defaultValue={42}
        helpText="Contact support to change the confirmed order."
        label="Confirmed quantity"
        readOnly
      >
        <NumericInput.Control>
          <NumericInput.Scrubber />
          <NumericInput.Input />
          <NumericInput.TriggerContainer>
            <NumericInput.IncrementTrigger />
            <NumericInput.DecrementTrigger />
          </NumericInput.TriggerContainer>
        </NumericInput.Control>
      </FormNumericInput>
    </div>
  ),
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

export const WithError: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "An associated error identifies the valid range and provides a clear correction.",
      },
    },
  },
  tags: ["ui-semantic-regression"],
  render: () => {
    const [value, setValue] = useState(150)
    const isInvalid = value < 0 || value > 100

    return (
      <div className="w-full max-w-md">
        <FormNumericInput
          allowOverflow
          helpText={isInvalid ? "Value must be between 0 and 100" : undefined}
          label="Quantity"
          max={100}
          min={0}
          onChange={setValue}
          validateStatus={isInvalid ? "error" : "default"}
          value={value}
        >
          <NumericInput.Control>
            <NumericInput.Input />
            <NumericInput.TriggerContainer>
              <NumericInput.IncrementTrigger />
              <NumericInput.DecrementTrigger />
            </NumericInput.TriggerContainer>
          </NumericInput.Control>
        </FormNumericInput>
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("spinbutton", {
      name: "Quantity",
    })
    await expect(input).toHaveAttribute("aria-invalid", "true")
    await expect(input).toHaveAccessibleDescription(
      "Value must be between 0 and 100"
    )
  },
}

// Validation States - Shows all validation states
export const Required: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Required quantities include a visible label indicator and helper guidance.",
      },
    },
  },
  render: () => {
    const [value, setValue] = useState(0)

    return (
      <div className="w-full max-w-md">
        <FormNumericInput
          helpText="This field is required"
          label="Quantity"
          max={100}
          min={0}
          onChange={setValue}
          required
          value={value}
        >
          <NumericInput.Control>
            <NumericInput.Input />
            <NumericInput.TriggerContainer>
              <NumericInput.IncrementTrigger />
              <NumericInput.DecrementTrigger />
            </NumericInput.TriggerContainer>
          </NumericInput.Control>
        </FormNumericInput>
      </div>
    )
  },
}

// Disabled State
export const HorizontalLayout: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Side controls preserve the field label and associated helper text.",
      },
    },
  },
  render: () => {
    const [value, setValue] = useState(50)

    return (
      <div className="w-full max-w-md">
        <FormNumericInput
          helpText="Horizontal layout example"
          label="Quantity"
          max={100}
          min={0}
          onChange={setValue}
          value={value}
        >
          <div className="flex gap-100">
            <NumericInput.DecrementTrigger icon="icon-[mdi--minus]" />
            <NumericInput.Control className="flex-1">
              <NumericInput.Input />
            </NumericInput.Control>
            <NumericInput.IncrementTrigger icon="icon-[mdi--plus]" />
          </div>
        </FormNumericInput>
      </div>
    )
  },
}

// Without Triggers - Keyboard and wheel control only
export const WithoutTriggers: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Direct numeric entry remains available in forms that do not need step buttons.",
      },
    },
  },
  render: () => {
    const [value, setValue] = useState(50)

    return (
      <div className="w-full max-w-md">
        <FormNumericInput
          allowMouseWheel
          helpText="Use arrow keys or mouse wheel to change value"
          label="Quantity"
          max={100}
          min={0}
          onChange={setValue}
          value={value}
        >
          <NumericInput.Control>
            <NumericInput.Input />
          </NumericInput.Control>
        </FormNumericInput>
      </div>
    )
  },
}

// With Scrubber - Drag to change value
export const WithScrubber: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Pointer scrubbing provides an optional alternative to typing or step buttons.",
      },
    },
  },
  render: () => {
    const [value, setValue] = useState(50)

    return (
      <div className="w-full max-w-md">
        <FormNumericInput
          helpText="Drag left/right on the input to change value"
          label="Quantity"
          max={100}
          min={0}
          onChange={setValue}
          step={5}
          value={value}
        >
          <NumericInput.Control>
            <NumericInput.Scrubber />
            <NumericInput.Input />
            <NumericInput.TriggerContainer>
              <NumericInput.IncrementTrigger />
              <NumericInput.DecrementTrigger />
            </NumericInput.TriggerContainer>
          </NumericInput.Control>
        </FormNumericInput>
      </div>
    )
  },
}

// All Sizes - Shows all size variants
export const WithPrecision: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Precision limits the displayed decimal places using locale-aware formatting.",
      },
    },
  },
  render: () => {
    const [value, setValue] = useState(3.14)

    return (
      <div className="w-full max-w-md">
        <FormNumericInput
          helpText="Supports 2 decimal places"
          label="Pi Approximation"
          max={10}
          min={0}
          onChange={setValue}
          precision={2}
          step={0.1}
          value={value}
        >
          <NumericInput.Control>
            <NumericInput.Input />
            <NumericInput.TriggerContainer>
              <NumericInput.IncrementTrigger />
              <NumericInput.DecrementTrigger />
            </NumericInput.TriggerContainer>
          </NumericInput.Control>
        </FormNumericInput>
      </div>
    )
  },
}

// Complex Demo - Full featured
export const ComplexDemo: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A bounded product quantity keeps constraints and feedback next to its editor.",
      },
    },
  },
  render: () => {
    const [value, setValue] = useState(50)
    const isInvalid = value < 0 || value > 100

    return (
      <div className="flex flex-col">
        <div>
          <FormNumericInput
            allowMouseWheel
            clampValueOnBlur
            helpText={
              isInvalid
                ? "Value must be between 0 and 100"
                : "Adjust quantity using buttons, arrow keys, or mouse wheel"
            }
            label="Product Quantity"
            max={100}
            min={0}
            onChange={setValue}
            required
            step={5}
            validateStatus={isInvalid ? "error" : "default"}
            value={value}
          >
            <NumericInput.Control>
              <NumericInput.Input />
              <NumericInput.TriggerContainer>
                <NumericInput.IncrementTrigger />
                <NumericInput.DecrementTrigger />
              </NumericInput.TriggerContainer>
            </NumericInput.Control>
          </FormNumericInput>
        </div>

        <div className="rounded-md bg-surface-secondary">
          <h3 className="mb-100 font-semibold text-fg-primary">
            Current State
          </h3>
          <ul className="space-y-050 text-fg-muted text-sm">
            <li>
              Value: <strong>{value}</strong>
            </li>
            <li>
              Status:{" "}
              <strong
                className={
                  isInvalid ? "text-fg-accent-danger" : "text-fg-accent-success"
                }
              >
                {isInvalid ? "Invalid" : "Valid"}
              </strong>
            </li>
            <li>Step: 5</li>
            <li>Min: 0, Max: 100</li>
          </ul>
        </div>
      </div>
    )
  },
}

export const ControlledDraft: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "String-controlled drafts retain empty and rejected text until the parent accepts an update.",
      },
    },
  },
  render() {
    const [value, setValue] = useState("2")
    const [committedValue, setCommittedValue] = useState("")
    const [numericValue, setNumericValue] = useState(2)
    const [rejected, setRejected] = useState(false)

    return (
      <div className="flex w-full max-w-md flex-col gap-100" lang="cs">
        <FormNumericInput
          allowOverflow={false}
          clampValueOnBlur={false}
          formatOptions={{ useGrouping: false, maximumFractionDigits: 2 }}
          helpText={
            rejected
              ? "Toto množství nelze dodat. Zvolte prosím jiné množství."
              : "Zadejte požadované množství. Desetinná čísla oddělujte čárkou."
          }
          label="Form draft quantity"
          locale="cs-CZ"
          max={10}
          min={0}
          onChange={(next) => {
            setNumericValue(next)
            formNumericChanged(next)
          }}
          onValueChange={(details) => {
            setValue(details.value)
            setRejected(false)
            formDraftChanged(details)
          }}
          onValueCommit={(details) => {
            setCommittedValue(details.value)
            formDraftCommitted(details)
          }}
          validateStatus={rejected ? "error" : "default"}
          value={value}
        >
          <NumericInput.Control>
            <NumericInput.Input />
            <NumericInput.TriggerContainer>
              <NumericInput.IncrementTrigger />
              <NumericInput.DecrementTrigger />
            </NumericInput.TriggerContainer>
          </NumericInput.Control>
        </FormNumericInput>
        <p data-testid="form-draft-value">
          Draft: {value === "" ? "(empty)" : value}
        </p>
        <p data-testid="form-committed-value">Committed: {committedValue}</p>
        <p data-testid="form-numeric-value">Numeric: {String(numericValue)}</p>
        <div className="flex flex-wrap gap-100">
          <Button onClick={() => setRejected(true)} variant="secondary">
            Reject draft
          </Button>
          <Button
            onClick={() => {
              setValue("2")
              setRejected(false)
            }}
            theme="outlined"
          >
            Reset from parent
          </Button>
        </div>
      </div>
    )
  },
}

export const CallerOwnedError: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Caller-owned errors stay associated when wrapper validation clears, until the caller clears its own error.",
      },
    },
  },
  render() {
    const id = useId()
    const [localError, setLocalError] = useState(true)
    const [callerError, setCallerError] = useState(true)
    return (
      <div className="flex w-full max-w-md flex-col gap-200">
        {callerError && (
          <StatusText id={id} status="error">
            Choose a quantity available in stock.
          </StatusText>
        )}
        <FormNumericInput
          aria-describedby={callerError ? id : undefined}
          aria-errormessage={callerError ? id : undefined}
          helpText={
            localError ? "Check the delivery details before saving." : undefined
          }
          invalid={callerError || undefined}
          label="Delivery details"
          validateStatus={localError ? "error" : "default"}
        >
          <NumericInput.Control>
            <NumericInput.Input />
          </NumericInput.Control>
        </FormNumericInput>
        <Button onClick={() => setLocalError(false)} variant="secondary">
          Clear field validation
        </Button>
        <Button onClick={() => setCallerError(false)} variant="secondary">
          Clear caller error
        </Button>
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("spinbutton")
    const callerId = canvas
      .getByText("Choose a quantity available in stock.")
      .closest('[role="alert"]')?.id
    await expect(input.getAttribute("aria-errormessage")?.split(" ")).toContain(
      callerId
    )
    await userEvent.click(
      canvas.getByRole("button", { name: "Clear field validation" })
    )
    await expect(input).toHaveAttribute("aria-invalid", "true")
    await expect(input).toHaveAttribute("aria-errormessage", callerId)
    await userEvent.click(
      canvas.getByRole("button", { name: "Clear caller error" })
    )
    await expect(input).not.toHaveAttribute("aria-errormessage")
  },
}
