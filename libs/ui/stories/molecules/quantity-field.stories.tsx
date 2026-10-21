import type { Meta, StoryObj } from "@storybook/react"
import { useRef, useState } from "react"
import { expect, fn, userEvent, within } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Button } from "../../src/atoms/button"
import {
  QuantityField,
  type QuantityFieldProps,
} from "../../src/molecules/quantity-field"

const changed = fn()
const committed = fn()
const meta: Meta<typeof QuantityField> = {
  title: "Molecules/QuantityField",
  component: QuantityField,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "A controlled quantity field for orders, carts and inventory with a linked unit, helper and error text. Use FormNumericInput for general labeled numbers without a unit, or NumericInput for a bare numeric control. Applications own validation and saving. Empty and rejected drafts remain editable; pending blocks editing and requires a localized status label. Typed values outside supplied bounds are retained while step controls respect those bounds.",
      },
    },
  },
  args: {
    label: "Quantity",
    unitLabel: "pieces",
    value: "2",
    min: 0,
    max: 10,
    step: 1,
    helperText: "Choose the quantity to order.",
    pendingLabel: "Updating quantity",
    onValueChange: changed,
    onValueCommit: committed,
  },
  argTypes: {
    label: { control: "text" },
    unitLabel: { control: "text" },
    helperText: { control: "text" },
    error: { control: "text" },
    size: { control: "select", options: ["sm", "md", "lg"] },
    min: { control: "number" },
    max: { control: "number" },
    step: { control: "number" },
    pending: { control: "boolean" },
    pendingLabel: { control: "text" },
    disabled: { control: "boolean" },
    readOnly: { control: "boolean" },
    hideLabel: { control: "boolean" },
    locale: { control: "select", options: ["en-US", "cs-CZ"] },
    value: { control: false },
    id: { control: false },
    name: { control: false },
    ref: { control: false },
    onValueChange: { control: false },
    onValueCommit: { control: false },
  },
}
export default meta
type Story = StoryObj<typeof QuantityField>

function ControlledField(args: QuantityFieldProps) {
  const [value, setValue] = useState(args.value)
  return (
    <QuantityField
      {...args}
      value={value}
      onValueChange={(details) => {
        setValue(details.value)
        args.onValueChange?.(details)
      }}
    />
  )
}

export const Playground: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Try the live controls and change the available options to find the right configuration for your form.",
      },
    },
  },
  render: (args) => (
    <div className="w-full max-w-md">
      <ControlledField {...args} />
    </div>
  ),
}

export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare Small (sm), Medium (md), and Large (lg) with identical copy and values to choose the right form density.",
      },
    },
  },
  render: (args) => (
    <VariantContainer>
      {(["sm", "md", "lg"] as const).map((size, index) => (
        <VariantGroup
          key={size}
          title={["Small (sm)", "Medium (md)", "Large (lg)"][index] ?? size}
        >
          <div className="w-full max-w-md">
            <ControlledField {...args} label="Quantity" size={size} />
          </div>
        </VariantGroup>
      ))}
    </VariantContainer>
  ),
}

export const Disabled: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Unavailable controls retain their visible values but cannot receive keyboard focus or change.",
      },
    },
  },
  args: { disabled: true },
  render: (args) => <ControlledField {...args} />,
}
export const ReadOnly: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Read-only values remain focusable and legible while pointer, keyboard and other editing paths are blocked.",
      },
    },
  },
  name: "Read-only",
  args: { readOnly: true },
  render: (args) => <ControlledField {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("spinbutton")
    await userEvent.click(input)
    await userEvent.keyboard("{ArrowUp}9{Backspace}")
    await expect(input).toHaveValue("2")
    await expect(input).toHaveFocus()
    await expect(getComputedStyle(input).cursor).toBe("text")
    await expect(
      canvas.queryByRole("button", { name: "Increment value" })
    ).not.toBeInTheDocument()
  },
}

export const States: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare editable, disabled, read-only and validation states to understand which interactions remain available.",
      },
    },
  },
  render: (args) => (
    <VariantContainer>
      <VariantGroup title="Editable and empty" fullWidth>
        <ControlledField {...args} label="Editable quantity" />
        <ControlledField {...args} label="Empty quantity" value="" />
      </VariantGroup>
      <VariantGroup title="Invalid with helper and error" fullWidth>
        <ControlledField
          {...args}
          label="Invalid quantity"
          value="12"
          error="Choose at most 10 pieces."
        />
      </VariantGroup>
      <VariantGroup title="Pending, disabled and read only" fullWidth>
        <ControlledField
          {...args}
          label="Pending quantity"
          pending
          pendingLabel="Updating quantity"
        />
        <ControlledField {...args} label="Disabled quantity" disabled />
        <ControlledField {...args} label="Read only quantity" readOnly />
      </VariantGroup>
    </VariantContainer>
  ),
}

export const RejectedUpdate: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Rejected changes remain visible for correction until the parent supplies an authoritative replacement.",
      },
    },
  },
  render: function Render(args) {
    const [value, setValue] = useState("2")
    const [error, setError] = useState<string>()
    return (
      <div className="w-full max-w-md flex flex-col gap-100">
        <p>
          Change the quantity, then choose Reject update. Your draft stays
          editable while the saved quantity remains 2. Reset from parent
          restores the saved value.
        </p>
        <QuantityField
          {...args}
          label="Order quantity"
          value={value}
          error={error}
          onValueChange={(details) => {
            setValue(details.value)
            setError(undefined)
            changed(details)
          }}
        />
        <p data-testid="draft-value">
          Draft: {value === "" ? "(empty)" : value}
        </p>
        <p>Saved quantity: 2</p>
        <div className="flex flex-wrap gap-100">
          <Button
            onClick={() =>
              setError(
                "This quantity cannot be supplied. Please choose another quantity."
              )
            }
          >
            Reject update
          </Button>
          <Button
            theme="outlined"
            onClick={() => {
              setValue("2")
              setError(undefined)
            }}
          >
            Reset from parent
          </Button>
        </div>
      </div>
    )
  },
}

export const DecimalQuantity: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Locale-aware decimal parsing and stepping preserve a partially entered numeric draft.",
      },
    },
  },
  args: {
    label: "Délka",
    unitLabel: "m",
    value: "1,5",
    step: 0.5,
    locale: "cs-CZ",
    formatOptions: { maximumFractionDigits: 2 },
    helperText: "Objednávejte po půl metru.",
  },
  render: (args) => (
    <div lang="cs" className="w-full max-w-md">
      <ControlledField {...args} />
    </div>
  ),
}

export const Bounds: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Step controls respect minimum and maximum values while typed overflow remains available for correction.",
      },
    },
  },
  render: (args) => (
    <VariantContainer>
      <VariantGroup title="Minimum and maximum" fullWidth>
        <ControlledField {...args} label="At minimum" value="0" />
        <ControlledField {...args} label="At maximum" value="10" />
      </VariantGroup>
      <VariantGroup title="Typed overflow stays editable" fullWidth>
        <ControlledField
          {...args}
          label="Outside bounds"
          value="12"
          error="Choose a quantity between 0 and 10."
        />
      </VariantGroup>
    </VariantContainer>
  ),
}

export const CompactLongUnit: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A long unit label wraps within a compact quantity row instead of forcing horizontal scrolling.",
      },
    },
    layout: "padded",
  },
  args: {
    label: "Quantity for stainless steel screws",
    hideLabel: true,
    size: "sm",
    unitLabel: "packages containing 100 stainless steel screws",
    helperText:
      "Each package is supplied as a complete unit. Removing the item is a separate action.",
  },
  render: (args) => (
    <div className="w-full max-w-xs flex flex-col gap-200">
      <p>
        The long unit wraps below the input in this compact layout. The label is
        visually hidden but still names the input for screen readers.
      </p>
      <ControlledField {...args} />
    </div>
  ),
}

export const PendingAndReadOnly: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Toggle pending and read-only independently to compare unavailable editing with inspectable immutable values.",
      },
    },
  },
  render: function Render(args) {
    const [value, setValue] = useState("2")
    const [pending, setPending] = useState(false)
    const [readOnly, setReadOnly] = useState(false)
    const [commitCount, setCommitCount] = useState(0)
    return (
      <div className="w-full max-w-md flex flex-col gap-100">
        <p>
          Change the quantity, then toggle pending or read only. Both block
          editing; pending also shows an update message. Your draft is retained.
        </p>
        <QuantityField
          {...args}
          label="Toggle quantity"
          value={value}
          pending={pending}
          pendingLabel="Updating quantity"
          readOnly={readOnly}
          onValueCommit={(details) => {
            setCommitCount((count) => count + 1)
            committed(details)
          }}
          onValueChange={(details) => {
            setValue(details.value)
            changed(details)
          }}
        />
        <p data-testid="draft-value">
          Draft: {value === "" ? "(empty)" : value}
        </p>
        <p>
          Commits count value confirmations when you press Enter or leave the
          editable input. The demo does not save data.
        </p>
        <p data-testid="commit-count">Commits: {commitCount}</p>
        <div className="flex flex-wrap gap-100">
          <Button
            aria-pressed={pending}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setPending(!pending)}
          >
            Toggle pending
          </Button>
          <Button
            aria-pressed={readOnly}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setReadOnly(!readOnly)}
          >
            Toggle read only
          </Button>
        </div>
      </div>
    )
  },
}

export const InputAttributes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Native input attributes and application event handlers reach the actual numeric input.",
      },
    },
  },
  render: (args) => (
    <div className="w-full max-w-md flex flex-col gap-200">
      <p>
        The first input receives focus automatically and an explicit accessible
        name.
      </p>
      <ControlledField
        {...args}
        label="Quantity"
        aria-label="Order quantity in pieces"
        autoFocus
      />
      <p>
        The second input uses the text below as its accessible name via
        aria-labelledby. Check the browser accessibility tree to compare the
        input names.
      </p>
      <p id="quantity-delivery-label">Quantity for the next delivery</p>
      <ControlledField
        {...args}
        label="Quantity"
        aria-labelledby="quantity-delivery-label"
      />
    </div>
  ),
}

export const FormIdentity: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Field IDs, labels, external descriptions and refs all resolve to the submitted native numeric input.",
      },
    },
  },
  render: function Render(args) {
    const [value, setValue] = useState("2")
    const [submitted, setSubmitted] = useState("")
    const inputRef = useRef<HTMLInputElement>(null)
    return (
      <div className="w-full max-w-md flex flex-col gap-100">
        <p id="quantity-external-description">
          Quantity requested for this order.
        </p>
        <p id="quantity-extra-description">
          Your saved quantity is unchanged until submitted.
        </p>
        <form
          id="quantity-order-form"
          onSubmit={(event) => {
            event.preventDefault()
            setSubmitted(
              String(new FormData(event.currentTarget).get("orderQuantity"))
            )
            committed(value)
          }}
        >
          <QuantityField
            {...args}
            id="quantity-order"
            name="orderQuantity"
            ref={inputRef}
            label="Form quantity"
            value={value}
            aria-describedby="quantity-external-description"
            describedBy="quantity-extra-description"
            onValueChange={(details) => {
              setValue(details.value)
              changed(details)
            }}
          />
          <Button type="submit" className="mt-100">
            Submit quantity
          </Button>
        </form>
        <Button theme="outlined" onClick={() => inputRef.current?.focus()}>
          Focus quantity
        </Button>
        <p data-testid="submitted-value">Submitted: {submitted}</p>
      </div>
    )
  },
}
