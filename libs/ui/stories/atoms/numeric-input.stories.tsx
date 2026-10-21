import type { Meta, StoryObj } from "@storybook/react"
import { useEffect, useId, useState } from "react"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Button } from "../../src/atoms/button"
import { Label } from "../../src/atoms/label"
import {
  NumericInput,
  type NumericInputProps,
} from "../../src/atoms/numeric-input"
import { FormNumericInput } from "../../src/molecules/form-numeric-input"

const draftChanged = fn()
const draftCommitted = fn()
const legacyChanged = fn()
const invalidChanged = fn()
const focusChanged = fn()

type PlaygroundArgs = NumericInputProps & {
  showLabel?: boolean
  label?: string
  showControls?: boolean
  showScrubber?: boolean
}

const playgroundSource = String.raw`import { useState } from "react"
import { NumericInput } from "@techsio/ui-kit/atoms/numeric-input"

export function QuantityField() {
  const [draft, setDraft] = useState("2")
  return (
    <NumericInput
      name="quantity"
      value={draft}
      onValueChange={({ value }) => setDraft(value)}
      min={0}
      max={100}
    >
      <NumericInput.Control>
        <NumericInput.Input aria-label="Quantity" />
        <NumericInput.TriggerContainer>
          <NumericInput.IncrementTrigger aria-label="Increase quantity" />
          <NumericInput.DecrementTrigger aria-label="Decrease quantity" />
        </NumericInput.TriggerContainer>
      </NumericInput.Control>
      <NumericInput.StatusText>Choose up to 100 items.</NumericInput.StatusText>
    </NumericInput>
  )
}`

const meta: Meta<typeof NumericInput> = {
  title: "Atoms/NumericInput",
  component: NumericInput,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: "Locale-aware numeric editing. Pair value with onValueChange={({ value }) => setDraft(value)} for controlled draft strings; onChange(number) is a legacy numeric projection and cannot preserve empty/intermediate text. defaultValue is uncontrolled. readOnly remains focusable and submits its value but blocks typing, keys, wheel, scrubbing and adjustment buttons. disabled removes interaction/submission. validateStatus=\"error\" or invalid marks the input invalid; render StatusText for linked guidance. form=\"owner-id\" on Root associates an external owner: accepted reset silently restores uncontrolled defaults after native cancellation has settled. Canceled resets preserve edits; controlled values remain authoritative and reset never emits a change callback.\n\n### Compound member contracts\n\n- **`NumericInput (Root)`** — No value required; value + onValueChange or defaultValue. No parent context. `ref`: `HTMLDivElement`.\n\n- **`NumericInput.Control`** — Visual input frame. Inside Root. `ref`: `HTMLDivElement`.\n\n- **`NumericInput.Input`** — Required editor; provide aria-label or associated Label htmlFor. Inside Root. `ref`: `HTMLInputElement`.\n\n- **`NumericInput.TriggerContainer`** — Optional adjustment layout. Inside Root. `ref`: `HTMLDivElement`.\n\n- **`NumericInput.IncrementTrigger`** — Optional increment button. Inside Root. `ref`: `HTMLButtonElement`.\n\n- **`NumericInput.DecrementTrigger`** — Optional decrement button. Inside Root. `ref`: `HTMLButtonElement`.\n\n- **`NumericInput.Scrubber`** — Optional pointer adjustment surface. Inside Root. `ref`: `HTMLDivElement`.\n\n- **`NumericInput.StatusText`** — Optional linked helper/validation; set status explicitly (default is neutral). Inside Root. `ref`: `HTMLDivElement`.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    id: { control: false, table: { disable: true } },
    ids: { control: false, table: { disable: true } },
    ref: { control: false, table: { disable: true } },
    value: { control: "number" },
    defaultValue: { control: "number" },
    onValueChange: { control: false, description: "Controlled draft proposal, including empty/intermediate text.", table: { type: { summary: "(details: { value: string; valueAsNumber: number }) => void" } } },
    onChange: { control: false, description: "Legacy numeric projection; prefer onValueChange for controlled text editing.", table: { type: { summary: "(value: number) => void" } } },
  },
}

export default meta
type Story = StoryObj<PlaygroundArgs>

export const Playground: Story = {
  parameters: {
    docs: {
      source: { code: playgroundSource, language: "tsx", type: "code" },
      description: {
        story:
          "Adjust the numeric options to explore locale formatting, constraints and interaction states.",
      },
    },
  },
  args: {
    defaultValue: 50.5,
    min: 0,
    max: 10_000,
    step: 0.1,
    disabled: false,
    invalid: false,
    size: "md",
    locale: "en-US",
    allowMouseWheel: true,
    clampValueOnBlur: true,
    precision: 1,
    showLabel: true,
    label: "Quantity",
    showControls: true,
    showScrubber: false,
  },
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "Size of the numeric input",
    },
    locale: {
      control: "select",
      options: ["en-US", "cs-CZ", "de-DE", "fr-FR"],
      description: "Locale for number formatting (decimal separator)",
    },
    min: { control: "number", description: "Minimum allowed value" },
    max: { control: "number", description: "Maximum allowed value" },
    step: { control: "number", description: "Step increment/decrement value" },
    disabled: { control: "boolean", description: "Disable the input" },
    readOnly: {
      control: "boolean",
      description: "Keep the number focusable without adjustments",
    },
    invalid: { control: "boolean", description: "Show invalid/error state" },
    allowMouseWheel: {
      control: "boolean",
      description: "Allow mouse wheel to change value",
    },
    clampValueOnBlur: {
      control: "boolean",
      description: "Clamp value to min/max on blur",
    },
    showLabel: {
      control: "boolean",
      description: "Show label above the input",
    },
    label: { control: "text", description: "Label text" },
    showControls: {
      control: "boolean",
      description: "Show increment/decrement buttons",
    },
    showScrubber: {
      control: "boolean",
      description: "Enable scrubber overlay",
    },
  },
  render(args) {
    const id = useId()
    const [value, setValue] = useState(args.value ?? args.defaultValue ?? 50.5)
    useEffect(() => {
      setValue(args.value ?? args.defaultValue ?? 50.5)
    }, [args.value, args.defaultValue])
    const { showLabel, label, showControls, showScrubber, ...numericArgs } =
      args
    return (
      <div className="flex w-full max-w-md flex-col gap-50">
        {showLabel && (
          <Label disabled={args.disabled} htmlFor={id} size={args.size}>
            {label}
          </Label>
        )}
        <NumericInput
          {...numericArgs}
          id={id}
          onChange={(next) => {
            setValue(next)
            args.onChange?.(next)
          }}
          value={value}
        >
          <NumericInput.Control>
            {showScrubber && <NumericInput.Scrubber />}
            <NumericInput.Input aria-label={showLabel ? undefined : label} />
            {showControls && (
              <NumericInput.TriggerContainer>
                <NumericInput.IncrementTrigger />
                <NumericInput.DecrementTrigger />
              </NumericInput.TriggerContainer>
            )}
          </NumericInput.Control>
        </NumericInput>
        <p className="mt-100 text-fg-muted text-sm">Current value: {value}</p>
      </div>
    )
  },
}

export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Small (sm), Medium (md) and Large (lg) show the same quantity in the canonical size order.",
      },
    },
  },
  render() {
    const instanceId = useId()
    return (
      <div className="flex flex-col gap-300">
        <div className="flex w-full max-w-md flex-col gap-50">
          <Label htmlFor={`${instanceId}-numeric-sm`} size="sm">
            Small (sm)
          </Label>
          <NumericInput
            defaultValue={10}
            id={`${instanceId}-numeric-sm`}
            size="sm"
          >
            <NumericInput.Control>
              <NumericInput.Input />
              <NumericInput.TriggerContainer>
                <NumericInput.IncrementTrigger />
                <NumericInput.DecrementTrigger />
              </NumericInput.TriggerContainer>
            </NumericInput.Control>
          </NumericInput>
        </div>

        <div className="flex w-full max-w-md flex-col gap-50">
          <Label htmlFor={`${instanceId}-numeric-md`} size="md">
            Medium (md)
          </Label>
          <NumericInput
            defaultValue={10}
            id={`${instanceId}-numeric-md`}
            size="md"
          >
            <NumericInput.Control>
              <NumericInput.Input />
              <NumericInput.TriggerContainer>
                <NumericInput.IncrementTrigger />
                <NumericInput.DecrementTrigger />
              </NumericInput.TriggerContainer>
            </NumericInput.Control>
          </NumericInput>
        </div>

        <div className="flex w-full max-w-md flex-col gap-50">
          <Label htmlFor={`${instanceId}-numeric-lg`} size="lg">
            Large (lg)
          </Label>
          <NumericInput
            defaultValue={10}
            id={`${instanceId}-numeric-lg`}
            size="lg"
          >
            <NumericInput.Control>
              <NumericInput.Input />
              <NumericInput.TriggerContainer>
                <NumericInput.IncrementTrigger />
                <NumericInput.DecrementTrigger />
              </NumericInput.TriggerContainer>
            </NumericInput.Control>
          </NumericInput>
        </div>
      </div>
    )
  },
}

export const Disabled: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Unavailable quantities leave the tab order and cannot be adjusted.",
      },
    },
  },
  render() {
    const instanceId = useId()
    return (
      <div className="flex w-full max-w-md flex-col gap-50">
        <Label htmlFor={`${instanceId}-numeric-disabled`}>Disabled Input</Label>
        <NumericInput
          defaultValue={42}
          disabled
          id={`${instanceId}-numeric-disabled`}
        >
          <NumericInput.Control>
            <NumericInput.Input />
            <NumericInput.TriggerContainer>
              <NumericInput.IncrementTrigger />
              <NumericInput.DecrementTrigger />
            </NumericInput.TriggerContainer>
          </NumericInput.Control>
        </NumericInput>
      </div>
    )
  },
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
  render() {
    const instanceId = useId()
    return (
      <div className="w-full max-w-md">
        <Label htmlFor={`${instanceId}-numeric-readonly`}>
          Confirmed quantity
        </Label>
        <NumericInput
          defaultValue={42}
          id={`${instanceId}-numeric-readonly`}
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
          <NumericInput.StatusText>
            Contact support to change the confirmed order.
          </NumericInput.StatusText>
        </NumericInput>
      </div>
    )
  },
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

export const WithLabel: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A visible label focuses the number editor and supports keyboard adjustments.",
      },
    },
  },
  tags: ["ui-semantic-regression"],
  render() {
    const instanceId = useId()
    const [value, setValue] = useState(42)

    return (
      <div className="flex w-full max-w-md flex-col gap-50">
        <Label htmlFor={`${instanceId}-numeric-with-label`}>Quantity</Label>
        <NumericInput
          id={`${instanceId}-numeric-with-label`}
          max={100}
          min={0}
          onChange={setValue}
          value={value}
        >
          <NumericInput.Control>
            <NumericInput.Input />
            <NumericInput.TriggerContainer>
              <NumericInput.IncrementTrigger />
              <NumericInput.DecrementTrigger />
            </NumericInput.TriggerContainer>
          </NumericInput.Control>
        </NumericInput>
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("spinbutton", { name: "Quantity" })
    const label = canvas.getByText("Quantity")
    await expect(label).toHaveAttribute("for", input.id)
    await userEvent.click(label)
    await expect(input).toHaveFocus()
    await userEvent.keyboard("{ArrowUp}")
    await waitFor(() => expect(input).toHaveAttribute("aria-valuenow", "43"))
    await userEvent.keyboard("{ArrowDown}")
    await waitFor(() => expect(input).toHaveAttribute("aria-valuenow", "42"))
    await userEvent.unhover(label)
    input.blur()
    await expect(input).not.toHaveFocus()
  },
}

export const WithoutControls: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Keyboard and direct entry remain available when adjustment buttons are omitted.",
      },
    },
  },
  render() {
    const instanceId = useId()
    const [value, setValue] = useState(50)

    return (
      <div className="flex w-full max-w-md flex-col gap-50">
        <Label htmlFor={`${instanceId}-numeric-no-controls`}>
          Use arrow keys or mouse wheel
        </Label>
        <NumericInput
          allowMouseWheel
          id={`${instanceId}-numeric-no-controls`}
          max={100}
          min={0}
          onChange={setValue}
          size="md"
          value={value}
        >
          <NumericInput.Control>
            <NumericInput.Input />
          </NumericInput.Control>
        </NumericInput>
        <p className="mt-50 text-fg-muted text-sm">Current value: {value}</p>
      </div>
    )
  },
}

export const WithScrubber: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Pointer scrubbing provides an optional alternative to typing or step buttons.",
      },
    },
  },
  render() {
    const instanceId = useId()
    const [value, setValue] = useState(50)

    return (
      <div className="flex w-full max-w-md flex-col gap-50">
        <Label htmlFor={`${instanceId}-numeric-scrubber`}>
          Drag left/right to change value
        </Label>
        <NumericInput
          id={`${instanceId}-numeric-scrubber`}
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
        </NumericInput>
        <p className="mt-50 text-fg-muted text-sm">Current value: {value}</p>
      </div>
    )
  },
}

export const MinMax: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Range constraints clamp on blur so the accepted quantity stays within the documented limits.",
      },
    },
  },
  render() {
    const instanceId = useId()
    const [value, setValue] = useState(5)

    return (
      <div className="flex w-full max-w-md flex-col gap-50">
        <Label htmlFor={`${instanceId}-numeric-minmax`}>
          Range: 0-10 (clamped on blur)
        </Label>
        <NumericInput
          clampValueOnBlur
          id={`${instanceId}-numeric-minmax`}
          max={10}
          min={0}
          onChange={setValue}
          step={1}
          value={value}
        >
          <NumericInput.Control>
            <NumericInput.Input />
            <NumericInput.TriggerContainer>
              <NumericInput.IncrementTrigger />
              <NumericInput.DecrementTrigger />
            </NumericInput.TriggerContainer>
          </NumericInput.Control>
        </NumericInput>
        <p className="mt-50 text-fg-muted text-sm">
          Try typing a value outside the range and blur the input
        </p>
      </div>
    )
  },
}

export const InvalidState: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "InvalidState demonstrates number entry for a specific form requirement.",
      },
    },
  },
  render() {
    const instanceId = useId()
    const [value, setValue] = useState(150)
    const isInvalid = value < 0 || value > 100

    return (
      <div className="flex w-full max-w-md flex-col gap-50">
        <Label htmlFor={`${instanceId}-numeric-invalid`}>
          Valid range: 0-100
        </Label>
        <NumericInput
          allowOverflow
          clampValueOnBlur={false}
          id={`${instanceId}-numeric-invalid`}
          invalid={isInvalid}
          max={100}
          min={0}
          onChange={setValue}
          value={value}
        >
          <NumericInput.Control>
            <NumericInput.Input />
            <NumericInput.TriggerContainer>
              <NumericInput.IncrementTrigger />
              <NumericInput.DecrementTrigger />
            </NumericInput.TriggerContainer>
          </NumericInput.Control>
          {isInvalid && (
            <NumericInput.StatusText status="error">
              Enter a quantity between 0 and 100.
            </NumericInput.StatusText>
          )}
        </NumericInput>
      </div>
    )
  },
}

export const WithPrecision: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Precision limits the displayed decimal places using locale-aware formatting.",
      },
    },
  },
  render() {
    const instanceId = useId()
    const [value, setValue] = useState(3.14)

    return (
      <div className="flex w-full max-w-md flex-col gap-50" lang="cs">
        <Label htmlFor={`${instanceId}-numeric-precision`}>
          Pi approximation (2 decimals)
        </Label>
        <NumericInput
          id={`${instanceId}-numeric-precision`}
          max={10}
          min={0}
          onChange={setValue}
          precision={2}
          step={0.01}
          value={value}
        >
          <NumericInput.Control>
            <NumericInput.Input />
            <NumericInput.TriggerContainer>
              <NumericInput.IncrementTrigger />
              <NumericInput.DecrementTrigger />
            </NumericInput.TriggerContainer>
          </NumericInput.Control>
        </NumericInput>
        <p className="mt-50 text-fg-muted text-sm">Current value: {value}</p>
      </div>
    )
  },
}

export const CustomLayoutHorizontal: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Side controls suit quantity adjustments without changing the number-editor semantics.",
      },
    },
  },
  render() {
    const instanceId = useId()
    const [value, setValue] = useState(50)

    return (
      <div className="flex w-full max-w-md flex-col gap-50">
        <Label htmlFor={`${instanceId}-numeric-custom-h`}>Custom Layout</Label>
        <NumericInput
          id={`${instanceId}-numeric-custom-h`}
          max={100}
          min={0}
          onChange={setValue}
          value={value}
        >
          <div className="flex gap-50">
            <NumericInput.DecrementTrigger icon="icon-[mdi--minus]" />
            <NumericInput.Control className="flex-1">
              <NumericInput.Input />
            </NumericInput.Control>
            <NumericInput.IncrementTrigger icon="icon-[mdi--plus]" />
          </div>
        </NumericInput>
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
    const instanceId = useId()
    const [value, setValue] = useState("2")
    const [committedValue, setCommittedValue] = useState("")
    return (
      <div className="flex w-full max-w-md flex-col gap-100">
        <Label htmlFor={`${instanceId}-numeric-controlled-draft`}>
          Draft quantity
        </Label>
        <NumericInput
          allowOverflow={false}
          clampValueOnBlur={false}
          id={`${instanceId}-numeric-controlled-draft`}
          max={10}
          min={0}
          onValueChange={(details) => {
            setValue(details.value)
            draftChanged(details)
          }}
          onValueCommit={(details) => {
            setCommittedValue(details.value)
            draftCommitted(details)
          }}
          value={value}
        >
          <NumericInput.Control>
            <NumericInput.Input />
            <NumericInput.TriggerContainer>
              <NumericInput.IncrementTrigger />
              <NumericInput.DecrementTrigger />
            </NumericInput.TriggerContainer>
          </NumericInput.Control>
        </NumericInput>
        <p data-testid="draft-value">
          Draft: {value === "" ? "(empty)" : value}
        </p>
        <p data-testid="committed-value">Committed: {committedValue}</p>
        <Button onClick={() => setValue("7")} variant="secondary">
          Set parent value to 7
        </Button>
      </div>
    )
  },
}

export const CallbackCompatibility: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Legacy numeric callbacks and Zag draft callbacks remain available together for existing forms.",
      },
    },
  },
  render() {
    const instanceId = useId()
    const [draft, setDraft] = useState("2")
    const [numeric, setNumeric] = useState<number>(2)
    const [counts, setCounts] = useState({
      numeric: 0,
      change: 0,
      commit: 0,
      invalid: 0,
      focus: 0,
    })
    const record = (key: keyof typeof counts) =>
      setCounts((previous) => ({ ...previous, [key]: previous[key] + 1 }))
    return (
      <div className="flex w-full max-w-md flex-col gap-100">
        <form
          id={`${instanceId}-numeric-callback-form`}
          onSubmit={(event) => event.preventDefault()}
        >
          <Label htmlFor={`${instanceId}-numeric-callback`}>
            Callback quantity
          </Label>
          <NumericInput
            form={`${instanceId}-numeric-callback-form`}
            id={`${instanceId}-numeric-callback`}
            max={10}
            min={0}
            name="callbackQuantity"
            onChange={(next) => {
              setNumeric(next)
              record("numeric")
              legacyChanged(next)
            }}
            onFocusChange={(details) => {
              record("focus")
              focusChanged(details)
            }}
            onValueChange={(details) => {
              setDraft(details.value)
              record("change")
              draftChanged(details)
            }}
            onValueCommit={(details) => {
              record("commit")
              draftCommitted(details)
            }}
            onValueInvalid={(details) => {
              record("invalid")
              invalidChanged(details)
            }}
            translations={{
              incrementLabel: "Increase callback quantity",
              decrementLabel: "Decrease callback quantity",
            }}
            value={draft}
          >
            <NumericInput.Control>
              <NumericInput.Input />
              <NumericInput.TriggerContainer>
                <NumericInput.IncrementTrigger />
                <NumericInput.DecrementTrigger />
              </NumericInput.TriggerContainer>
            </NumericInput.Control>
          </NumericInput>
        </form>
        <p data-testid="draft-value">
          Draft: {draft === "" ? "(empty)" : draft}
        </p>
        <p data-testid="numeric-value">Numeric: {String(numeric)}</p>
        <p data-testid="callback-counts">{JSON.stringify(counts)}</p>
        <Button onClick={() => setDraft("2")} theme="outlined">
          Reset parent value
        </Button>
      </div>
    )
  },
}

export const UncontrolledDefaults: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Numeric and string defaults support editing without a controlled parent.",
      },
    },
  },
  render() {
    const instanceId = useId()
    return (
      <VariantContainer>
        <VariantGroup fullWidth title="Legacy numeric default">
          <Label htmlFor={`${instanceId}-numeric-default-number`}>
            Numeric default quantity
          </Label>
          <NumericInput
            defaultValue={2}
            id={`${instanceId}-numeric-default-number`}
            max={10}
            min={0}
            onChange={legacyChanged}
          >
            <NumericInput.Control>
              <NumericInput.Input />
              <NumericInput.TriggerContainer>
                <NumericInput.IncrementTrigger />
                <NumericInput.DecrementTrigger />
              </NumericInput.TriggerContainer>
            </NumericInput.Control>
          </NumericInput>
        </VariantGroup>
        <VariantGroup fullWidth title="String default">
          <Label htmlFor={`${instanceId}-numeric-default-string`}>
            String default quantity
          </Label>
          <NumericInput
            clampValueOnBlur={false}
            defaultValue="2"
            id={`${instanceId}-numeric-default-string`}
            max={10}
            min={0}
            onValueChange={draftChanged}
          >
            <NumericInput.Control>
              <NumericInput.Input />
              <NumericInput.TriggerContainer>
                <NumericInput.IncrementTrigger />
                <NumericInput.DecrementTrigger />
              </NumericInput.TriggerContainer>
            </NumericInput.Control>
          </NumericInput>
        </VariantGroup>
      </VariantContainer>
    )
  },
}

export const ExplicitUndefinedDefaults: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Explicit undefined options retain the same behavior as omitted defaults.",
      },
    },
  },
  render() {
    const instanceId = useId()
    return (
      <div className="flex w-full max-w-md flex-col gap-100">
        <Label htmlFor={`${instanceId}-numeric-undefined-defaults`}>
          Undefined defaults quantity
        </Label>
        <NumericInput
          allowMouseWheel={undefined}
          allowOverflow
          clampValueOnBlur={undefined}
          defaultValue={2}
          formatOptions={{ style: "percent" }}
          id={`${instanceId}-numeric-undefined-defaults`}
          locale="en-US"
          max={10}
          min={0}
          onChange={legacyChanged}
          spinOnPress={undefined}
          step={undefined}
        >
          <NumericInput.Control>
            <NumericInput.Input />
            <NumericInput.TriggerContainer>
              <NumericInput.IncrementTrigger />
              <NumericInput.DecrementTrigger />
            </NumericInput.TriggerContainer>
          </NumericInput.Control>
        </NumericInput>
        <p>
          Arrow keys and the wheel use the default step. Typed overflow clamps
          on blur.
        </p>
      </div>
    )
  },
}

export const PrecisionZero: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Zero precision formats numeric initial values as whole units; typed fractional drafts remain available for application validation instead of being silently rounded.",
      },
    },
  },
  render: () => (
    <NumericInput defaultValue={1.75} locale="en-US" precision={0}>
      <NumericInput.Control>
        <NumericInput.Input aria-label="Whole units" />
        <NumericInput.TriggerContainer>
          <NumericInput.IncrementTrigger />
          <NumericInput.DecrementTrigger />
        </NumericInput.TriggerContainer>
      </NumericInput.Control>
    </NumericInput>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("spinbutton")).toHaveValue("2")
  },
}

export const ReadOnlyTransition: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Locking an active numeric editor cancels ongoing adjustments, preserves out-of-range values on blur and still accepts parent updates.",
      },
    },
  },
  render() {
    const [readOnly, setReadOnly] = useState(false)
    const [value, setValue] = useState(150)
    return (
      <div className="flex w-full max-w-md flex-col gap-200">
        <NumericInput
          allowOverflow
          clampValueOnBlur
          max={100}
          min={0}
          onChange={setValue}
          readOnly={readOnly}
          value={value}
        >
          <NumericInput.Control>
            <NumericInput.Input aria-label="Lockable quantity" />
            <NumericInput.TriggerContainer>
              <NumericInput.IncrementTrigger />
              <NumericInput.DecrementTrigger />
            </NumericInput.TriggerContainer>
          </NumericInput.Control>
          <NumericInput.StatusText>
            Enter a quantity between 0 and 100 when editing is available.
          </NumericInput.StatusText>
        </NumericInput>
        <Button onClick={() => setReadOnly(true)} variant="secondary">
          Lock quantity
        </Button>
        <Button onClick={() => setValue(75)} variant="secondary">
          Update from parent
        </Button>
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("spinbutton")
    await userEvent.click(canvas.getByRole("button", { name: "Lock quantity" }))
    await userEvent.click(input)
    await userEvent.keyboard("{ArrowUp}{ArrowDown}{Home}{End}9")
    await userEvent.tab()
    await expect(input).toHaveValue("150")
    await userEvent.click(
      canvas.getByRole("button", { name: "Update from parent" })
    )
    await expect(input).toHaveValue("75")
  },
}

export const FeedbackLifecycle: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Multiple mounted descriptions are merged with caller guidance, and removing an error cleans up only its references.",
      },
    },
  },
  render() {
    const instanceId = useId()
    const [invalid, setInvalid] = useState(true)
    return (
      <div className="flex w-full max-w-md flex-col gap-200">
        <p id={`${instanceId}-numeric-external-guidance`}>
          Only used for this order.
        </p>
        <NumericInput
          defaultValue={2}
          describedBy={`${instanceId}-numeric-external-guidance`}
        >
          <NumericInput.Control>
            <NumericInput.Input aria-label="Delivery quantity" />
            <NumericInput.TriggerContainer>
              <NumericInput.IncrementTrigger />
              <NumericInput.DecrementTrigger />
            </NumericInput.TriggerContainer>
          </NumericInput.Control>
          <NumericInput.StatusText>
            Up to 100 per order.
          </NumericInput.StatusText>
          {invalid && (
            <NumericInput.StatusText status="error">
              Enter a quantity available in stock.
            </NumericInput.StatusText>
          )}
        </NumericInput>
        <Button onClick={() => setInvalid(false)} variant="secondary">
          Clear validation
        </Button>
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("spinbutton")
    await expect(input).toHaveAttribute("aria-invalid", "true")
    await expect(input).toHaveAttribute("aria-errormessage")
    await userEvent.click(
      canvas.getByRole("button", { name: "Clear validation" })
    )
    await expect(input).not.toHaveAttribute("aria-errormessage")
    await expect(input).toHaveAccessibleDescription(
      "Only used for this order. Up to 100 per order."
    )
  },
}

const trackResetDraft = fn()
export const ExternalOwnerReset: Story = {
  parameters: { controls: { disable: true }, docs: { description: { story: "Root form associates native NumericInput.Input with an external owner. Accepted resets restore defaultValue; React or later native cancellation preserves edits. Reassociation detaches the old owner, while a refusing controlled parent remains authoritative." } } },
  render: function ExternalOwnerReset() {
    const id = useId()
    const [owner, setOwner] = useState("first")
    const [cancel, setCancel] = useState(false)
    const [controlled, setControlled] = useState(8)
    const form = `${id}-${owner}`
    return <div className="grid w-full max-w-sm gap-200">
      <form id={`${id}-first`} aria-label="First owner" onReset={event => { if (cancel) event.preventDefault() }} />
      <form id={`${id}-second`} aria-label="Second owner" onReset={event => { if (cancel) event.preventDefault() }} />
      <NumericInput form={form} name="quantity" defaultValue={3} locale="en-US"><NumericInput.Control><NumericInput.Input aria-label="Reset quantity" /></NumericInput.Control></NumericInput>
      <NumericInput form={form} name="fixed" value={controlled} locale="en-US" onValueChange={trackResetDraft}><NumericInput.Control><NumericInput.Input aria-label="Controlled quantity" /></NumericInput.Control></NumericInput>
      <Button form={form} type="reset">Reset owner</Button>
      <Button onClick={() => setCancel(!cancel)}>Cancel reset: {cancel ? "on" : "off"}</Button>
      <Button onClick={() => setOwner(owner === "first" ? "second" : "first")}>Reassociate owner</Button>
      <Button onClick={() => setControlled(9)}>Update controlled value</Button>
    </div>
  },
  play: async ({ canvasElement }) => {
    trackResetDraft.mockClear()
    const canvas = within(canvasElement)
    const input = canvas.getByRole("spinbutton", { name: "Reset quantity" }) as HTMLInputElement
    const controlled = canvas.getByRole("spinbutton", { name: "Controlled quantity" })
    const oldOwner = input.form!
    const edit = async (value: string) => { await userEvent.clear(input); await userEvent.type(input, value) }
    await edit("12")
    await userEvent.click(canvas.getByRole("button", { name: "Cancel reset: off" }))
    await userEvent.click(canvas.getByRole("button", { name: "Reset owner" }))
    await new Promise(resolve => setTimeout(resolve, 30))
    await expect(input).toHaveValue("12")
    await userEvent.click(canvas.getByRole("button", { name: "Cancel reset: on" }))
    oldOwner.addEventListener("reset", event => event.preventDefault(), { once: true })
    await userEvent.click(canvas.getByRole("button", { name: "Reset owner" }))
    await new Promise(resolve => setTimeout(resolve, 30))
    await expect(input).toHaveValue("12")
    await userEvent.click(canvas.getByRole("button", { name: "Update controlled value" }))
    await userEvent.click(canvas.getByRole("button", { name: "Reset owner" }))
    await waitFor(() => expect(input).toHaveValue("3"))
    await expect(controlled).toHaveValue("9")
    await edit("14")
    await userEvent.click(canvas.getByRole("button", { name: "Reassociate owner" }))
    oldOwner.reset()
    await new Promise(resolve => setTimeout(resolve, 30))
    await expect(input).toHaveValue("14")
    await userEvent.click(canvas.getByRole("button", { name: "Reset owner" }))
    await waitFor(() => expect(input).toHaveValue("3"))
    await expect(controlled).toHaveValue("9")
    await expect(trackResetDraft).not.toHaveBeenCalled()
    await edit("15")
    const dispatchingOwner = input.form!
    dispatchingOwner.addEventListener("reset", () => {
      input.setAttribute("form", oldOwner.id)
    }, { once: true })
    await userEvent.click(canvas.getByRole("button", { name: "Reset owner" }))
    await new Promise(resolve => setTimeout(resolve, 30))
    await expect(input).toHaveValue("15")
    await expect(new FormData(oldOwner).get("quantity")).toBe("15")
    // This refusing parent only observes with fn(); it does not rerender to
    // repair the input. Repeated edits must still restore native authority.
    const fixed = controlled as HTMLInputElement
    for (const draft of ["7", "6"]) {
      await userEvent.click(fixed)
      fixed.setSelectionRange(0, fixed.value.length)
      await userEvent.keyboard(draft)
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
      await expect(fixed).toHaveValue("9")
      await expect(fixed).toHaveAttribute("aria-valuenow", "9")
      await expect(new FormData(fixed.form!).get("fixed")).toBe("9")
    }
    await expect(trackResetDraft).toHaveBeenCalledTimes(2)
  },
}


const observedBlur = fn()
const observedCommit = fn()
const canceledBlur = fn()
export const NativeEventComposition: Story = {
  parameters: {
    controls: { disable: true },
    docs: { description: { story: "Input handlers observe before Zag. An observational onBlur preserves clamping and commit; preventDefault() cancels that machine action." } },
  },
  render: () => (
    <div className="grid w-full max-w-sm gap-200">
      <NumericInput defaultValue={2} min={0} max={10} onValueCommit={observedCommit}>
        <NumericInput.Control>
          <NumericInput.Input aria-label="Observed blur" onBlur={observedBlur} />
        </NumericInput.Control>
      </NumericInput>
      <NumericInput defaultValue={2} min={0} max={10}>
        <NumericInput.Control>
          <NumericInput.Input aria-label="Canceled blur" onBlur={event => { canceledBlur(); event.preventDefault() }} />
        </NumericInput.Control>
      </NumericInput>
      <Button>Continue</Button>
    </div>
  ),
  play: async ({ canvasElement }) => {
    observedBlur.mockClear()
    observedCommit.mockClear()
    canceledBlur.mockClear()
    const canvas = within(canvasElement)
    const observed = canvas.getByRole("spinbutton", { name: "Observed blur" })
    const canceled = canvas.getByRole("spinbutton", { name: "Canceled blur" })
    await userEvent.clear(observed)
    await userEvent.type(observed, "99")
    await userEvent.tab()
    await waitFor(() => expect(observed).toHaveValue("10"))
    await expect(observedBlur).toHaveBeenCalledTimes(1)
    await expect(observedCommit).toHaveBeenCalledTimes(1)
    await expect(observedCommit).toHaveBeenCalledWith({ value: "10", valueAsNumber: 10 })
    await userEvent.clear(canceled)
    await userEvent.type(canceled, "99")
    await userEvent.tab()
    await expect(canceled).toHaveValue("99")
    await expect(canceledBlur).toHaveBeenCalledTimes(1)
  },
}

type ResetAuthority = "uncontrolled" | "accept" | "refuse"

function NativeResetTrackerField({
  wrapped,
  authority,
}: {
  wrapped: boolean
  authority: ResetAuthority
}) {
  const initialValue = wrapped ? 50 : 20
  const [value, setValue] = useState(initialValue)
  const [nativeChanges, setNativeChanges] = useState(0)
  const [proposals, setProposals] = useState(0)
  const label = `${wrapped ? "FormNumericInput" : "NumericInput"} ${authority}`
  const fieldProps: NumericInputProps = {
    name: "quantity",
    defaultValue: initialValue,
    value: authority === "uncontrolled" ? undefined : value,
    locale: "en-US",
    onValueChange: ({ valueAsNumber }) => {
      setProposals((count) => count + 1)
      if (authority === "accept") {
        setValue(valueAsNumber)
      }
    },
  }
  const editor = (
    <NumericInput.Control>
      <NumericInput.Input
        aria-label={label}
        onChange={() => setNativeChanges((count) => count + 1)}
      />
    </NumericInput.Control>
  )
  return (
    <form aria-label={label} className="grid gap-100">
      {wrapped ? (
        <FormNumericInput {...fieldProps} label={label}>
          {editor}
        </FormNumericInput>
      ) : (
        <NumericInput {...fieldProps}>{editor}</NumericInput>
      )}
      <output aria-label="Native changes">{nativeChanges}</output>
      <output aria-label="Value proposals">{proposals}</output>
      <Button type="reset" variant="secondary">Reset quantity</Button>
      {authority !== "uncontrolled" && (
        <Button onClick={() => setValue(60)} variant="secondary">
          Update parent
        </Button>
      )}
    </form>
  )
}

export const NativeResetTracker: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story: "Native Input onChange and machine value proposals remain independent: silent resets restore uncontrolled defaults or controlled authority, and the next identical user edit is still reported by React, including through FormNumericInput.",
      },
    },
  },
  render: () => (
    <div className="grid w-full max-w-md gap-300">
      {[false, true].flatMap((wrapped) =>
        (["uncontrolled", "accept", "refuse"] as const).map((authority) => (
          <NativeResetTrackerField
            authority={authority}
            key={`${wrapped}-${authority}`}
            wrapped={wrapped}
          />
        ))
      )}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const settle = () =>
      new Promise<void>((resolve) => {
        const view = canvasElement.ownerDocument.defaultView!
        setTimeout(() => {
          view.requestAnimationFrame(() => {
            view.requestAnimationFrame(() => resolve())
          })
        }, 0)
      })
    for (const wrapped of [false, true]) {
      for (const authority of ["uncontrolled", "accept", "refuse"] as const) {
        const label = `${wrapped ? "FormNumericInput" : "NumericInput"} ${authority}`
        const form = canvas.getByRole("form", { name: label }) as HTMLFormElement
        const field = within(form)
        const input = field.getByRole("spinbutton") as HTMLInputElement
        const initial = wrapped ? "50" : "20"
        const edit = async (draft: string) => {
          await userEvent.click(input)
          input.setSelectionRange(0, input.value.length)
          // One real replacement edit, not clear()+type(): clearing would update
          // the stale tracker first and hide the identical-post-reset regression.
          await userEvent.keyboard(draft)
          await settle()
        }
        const assertValue = async (expected: string) => {
          await expect(input).toHaveValue(expected)
          await expect(input).toHaveAttribute("aria-valuenow", expected)
          await expect(new FormData(form).get("quantity")).toBe(expected)
        }
        await edit("7")
        const assertCounts = async (count: number) => {
          for (const channel of ["Native changes", "Value proposals"]) {
            await expect(field.getByLabelText(channel)).toHaveTextContent(
              new RegExp(`^${count}$`)
            )
          }
        }
        const reset = field.getByRole("button", { name: "Reset quantity" })
        await assertCounts(1)
        await assertValue(authority === "refuse" ? initial : "7")
        await userEvent.click(reset)
        await settle()
        await assertValue(authority === "accept" ? "7" : initial)
        await assertCounts(1)
        const nextDraft = authority === "accept" ? "8" : "7"
        await edit(nextDraft)
        await assertCounts(2)
        const authoritative = authority === "refuse" ? initial : nextDraft
        await assertValue(authoritative)
        // A canceled native reset must leave the current value and both counts.
        form.addEventListener("reset", (event) => event.preventDefault(), {
          once: true,
        })
        await userEvent.click(reset)
        await settle()
        await assertValue(authoritative)
        await assertCounts(2)
        if (authority !== "uncontrolled") {
          await userEvent.click(
            field.getByRole("button", { name: "Update parent" })
          )
          await settle()
          await userEvent.click(reset)
          await settle()
          await assertValue("60")
          await assertCounts(2)
        }
      }
    }
  },
}
