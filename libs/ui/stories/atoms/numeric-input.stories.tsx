import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"

import { Label } from "../../src/atoms/label"
import { NumericInput } from "../../src/atoms/numeric-input"
import type { NumericInputProps } from "../../src/atoms/numeric-input"

type PlaygroundArgs = NumericInputProps & {
  showLabel?: boolean
  label?: string
  showControls?: boolean
  showScrubber?: boolean
}

const meta: Meta<typeof NumericInput> = {
  component: NumericInput,
  parameters: {
    docs: {
      description: {
        component:
          "A flexible numeric input component using compound pattern. Provides granular control over layout and behavior through composable subcomponents.",
      },
    },
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "Atoms/NumericInput",
}

export default meta
type Story = StoryObj<PlaygroundArgs>

const PlaygroundStory = (args: PlaygroundArgs) => {
  const [value, setValue] = useState(50.5)
  const { showLabel, label, showControls, showScrubber, ...numericArgs } = args
  return (
    <div className="flex w-md flex-col gap-50">
      {showLabel === true && (
        <Label htmlFor="numeric-playground">{label}</Label>
      )}
      <NumericInput
        {...numericArgs}
        id="numeric-playground"
        value={value}
        onChange={setValue}
      >
        <NumericInput.Control>
          {showScrubber === true && <NumericInput.Scrubber />}
          <NumericInput.Input />
          {showControls === true && (
            <NumericInput.TriggerContainer>
              <NumericInput.IncrementTrigger />
              <NumericInput.DecrementTrigger />
            </NumericInput.TriggerContainer>
          )}
        </NumericInput.Control>
      </NumericInput>
      <p className="mt-100 text-sm text-fg-secondary">Current value: {value}</p>
    </div>
  )
}

export const Playground: Story = {
  argTypes: {
    allowMouseWheel: {
      control: "boolean",
      description: "Allow mouse wheel to change value",
    },
    clampValueOnBlur: {
      control: "boolean",
      description: "Clamp value to min/max on blur",
    },
    disabled: { control: "boolean", description: "Disable the input" },
    invalid: { control: "boolean", description: "Show invalid/error state" },
    label: { control: "text", description: "Label text" },
    locale: {
      control: "select",
      description: "Locale for number formatting (decimal separator)",
      options: ["en-US", "cs-CZ", "de-DE", "fr-FR"],
    },
    max: { control: "number", description: "Maximum allowed value" },
    min: { control: "number", description: "Minimum allowed value" },
    showControls: {
      control: "boolean",
      description: "Show increment/decrement buttons",
    },
    showLabel: {
      control: "boolean",
      description: "Show label above the input",
    },
    showScrubber: {
      control: "boolean",
      description: "Enable scrubber overlay",
    },
    size: {
      control: "select",
      description: "Size of the numeric input",
      options: ["sm", "md", "lg"],
    },
    step: { control: "number", description: "Step increment/decrement value" },
  },
  args: {
    allowMouseWheel: true,
    clampValueOnBlur: true,
    disabled: false,
    invalid: false,
    label: "Quantity",
    locale: "en-US",
    max: 10_000,
    min: 0,
    precision: 1,
    showControls: true,
    showLabel: false,
    showScrubber: false,
    size: "md",
    step: 0.1,
  },
  render: PlaygroundStory,
}

const WithLabelStory: NonNullable<Story["render"]> = () => {
  const [value, setValue] = useState(42)

  return (
    <div className="flex w-md flex-col gap-50">
      <Label htmlFor="numeric-with-label">Quantity</Label>
      <NumericInput
        id="numeric-with-label"
        value={value}
        onChange={setValue}
        min={0}
        max={100}
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
}

export const WithLabel: Story = {
  render: WithLabelStory,
}

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-300">
      <div className="flex w-md flex-col gap-50">
        <Label htmlFor="numeric-sm" size="sm">
          Small (sm)
        </Label>
        <NumericInput id="numeric-sm" size="sm" defaultValue={10}>
          <NumericInput.Control>
            <NumericInput.Input />
            <NumericInput.TriggerContainer>
              <NumericInput.IncrementTrigger />
              <NumericInput.DecrementTrigger />
            </NumericInput.TriggerContainer>
          </NumericInput.Control>
        </NumericInput>
      </div>

      <div className="flex w-md flex-col gap-50">
        <Label htmlFor="numeric-md" size="md">
          Medium (md)
        </Label>
        <NumericInput id="numeric-md" size="md" defaultValue={20}>
          <NumericInput.Control>
            <NumericInput.Input />
            <NumericInput.TriggerContainer>
              <NumericInput.IncrementTrigger />
              <NumericInput.DecrementTrigger />
            </NumericInput.TriggerContainer>
          </NumericInput.Control>
        </NumericInput>
      </div>

      <div className="flex w-md flex-col gap-50">
        <Label htmlFor="numeric-lg" size="lg">
          Large (lg)
        </Label>
        <NumericInput id="numeric-lg" size="lg" defaultValue={30}>
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
  ),
}

const WithoutControlsStory: NonNullable<Story["render"]> = () => {
  const [value, setValue] = useState(50)

  return (
    <div className="flex w-md flex-col gap-50">
      <Label htmlFor="numeric-no-controls">Use arrow keys or mouse wheel</Label>
      <NumericInput
        id="numeric-no-controls"
        value={value}
        onChange={setValue}
        min={0}
        max={100}
        allowMouseWheel
        size="md"
      >
        <NumericInput.Control>
          <NumericInput.Input />
        </NumericInput.Control>
      </NumericInput>
      <p className="mt-50 text-sm text-fg-secondary">Current value: {value}</p>
    </div>
  )
}

export const WithoutControls: Story = {
  render: WithoutControlsStory,
}

const WithScrubberStory: NonNullable<Story["render"]> = () => {
  const [value, setValue] = useState(50)

  return (
    <div className="flex w-md flex-col gap-50">
      <Label htmlFor="numeric-scrubber">Drag left/right to change value</Label>
      <NumericInput
        id="numeric-scrubber"
        value={value}
        onChange={setValue}
        min={0}
        max={100}
        step={5}
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
      <p className="mt-50 text-sm text-fg-secondary">Current value: {value}</p>
    </div>
  )
}

export const WithScrubber: Story = {
  render: WithScrubberStory,
}

const MinMaxStory: NonNullable<Story["render"]> = () => {
  const [value, setValue] = useState(5)

  return (
    <div className="flex w-md flex-col gap-50">
      <Label htmlFor="numeric-minmax">Range: 0-10 (clamped on blur)</Label>
      <NumericInput
        id="numeric-minmax"
        value={value}
        onChange={setValue}
        min={0}
        max={10}
        step={1}
        clampValueOnBlur
      >
        <NumericInput.Control>
          <NumericInput.Input />
          <NumericInput.TriggerContainer>
            <NumericInput.IncrementTrigger />
            <NumericInput.DecrementTrigger />
          </NumericInput.TriggerContainer>
        </NumericInput.Control>
      </NumericInput>
      <p className="mt-50 text-sm text-fg-secondary">
        Try typing a value outside the range and blur the input
      </p>
    </div>
  )
}

export const MinMax: Story = {
  render: MinMaxStory,
}

const InvalidStateStory: NonNullable<Story["render"]> = () => {
  const [value, setValue] = useState(150)
  const isInvalid = value < 0 || value > 100

  return (
    <div className="flex w-md flex-col gap-50">
      <Label htmlFor="numeric-invalid">Valid range: 0-100</Label>
      <NumericInput
        id="numeric-invalid"
        value={value}
        onChange={setValue}
        min={0}
        max={100}
        invalid={isInvalid}
        allowOverflow
        clampValueOnBlur={false}
      >
        <NumericInput.Control>
          <NumericInput.Input />
          <NumericInput.TriggerContainer>
            <NumericInput.IncrementTrigger />
            <NumericInput.DecrementTrigger />
          </NumericInput.TriggerContainer>
        </NumericInput.Control>
      </NumericInput>
      {isInvalid && (
        <p className="mt-50 text-sm text-fg-accent-danger">
          Value must be between 0 and 100
        </p>
      )}
    </div>
  )
}

export const InvalidState: Story = {
  render: InvalidStateStory,
}

const WithPrecisionStory: NonNullable<Story["render"]> = () => {
  const [value, setValue] = useState(3.14)

  return (
    <div lang="cs" className="flex w-md flex-col gap-50">
      <Label htmlFor="numeric-precision">Pi approximation (2 decimals)</Label>
      <NumericInput
        id="numeric-precision"
        value={value}
        onChange={setValue}
        min={0}
        max={10}
        step={0.01}
        precision={2}
      >
        <NumericInput.Control>
          <NumericInput.Input />
          <NumericInput.TriggerContainer>
            <NumericInput.IncrementTrigger />
            <NumericInput.DecrementTrigger />
          </NumericInput.TriggerContainer>
        </NumericInput.Control>
      </NumericInput>
      <p className="mt-50 text-sm text-fg-secondary">Current value: {value}</p>
    </div>
  )
}

export const WithPrecision: Story = {
  render: WithPrecisionStory,
}

const CustomLayoutHorizontalStory: NonNullable<Story["render"]> = () => {
  const [value, setValue] = useState(50)

  return (
    <div className="flex w-md flex-col gap-50">
      <Label htmlFor="numeric-custom-h">Custom Layout</Label>
      <NumericInput
        id="numeric-custom-h"
        value={value}
        onChange={setValue}
        min={0}
        max={100}
      >
        <div className="flex gap-50">
          <NumericInput.DecrementTrigger
            className="bg-overlay"
            icon="icon-[mdi--minus]"
          />
          <NumericInput.Control className="flex-1">
            <NumericInput.Input />
          </NumericInput.Control>
          <NumericInput.IncrementTrigger
            className="bg-overlay"
            icon="icon-[mdi--plus]"
          />
        </div>
      </NumericInput>
    </div>
  )
}

export const CustomLayoutHorizontal: Story = {
  render: CustomLayoutHorizontalStory,
}

export const Disabled: Story = {
  render: () => (
    <div className="flex w-md flex-col gap-50">
      <Label htmlFor="numeric-disabled">Disabled Input</Label>
      <NumericInput id="numeric-disabled" defaultValue={42} disabled>
        <NumericInput.Control>
          <NumericInput.Input />
          <NumericInput.TriggerContainer>
            <NumericInput.IncrementTrigger />
            <NumericInput.DecrementTrigger />
          </NumericInput.TriggerContainer>
        </NumericInput.Control>
      </NumericInput>
    </div>
  ),
}

const CustomButtonPropsStory: NonNullable<Story["render"]> = () => {
  const [value1, setValue1] = useState(10)
  const [value3, setValue3] = useState(30)

  return (
    <div className="flex flex-col gap-300">
      <div className="flex w-md flex-col gap-50">
        <Label htmlFor="numeric-variant">Different Variants</Label>
        <NumericInput
          id="numeric-variant"
          value={value1}
          onChange={setValue1}
          min={0}
          max={100}
        >
          <NumericInput.Control>
            <NumericInput.Input />
            <NumericInput.TriggerContainer>
              <NumericInput.IncrementTrigger variant="primary" />
              <NumericInput.DecrementTrigger variant="danger" />
            </NumericInput.TriggerContainer>
          </NumericInput.Control>
        </NumericInput>
      </div>

      <div className="flex w-md flex-col gap-50">
        <Label htmlFor="numeric-size">Different Themes</Label>
        <NumericInput
          id="numeric-size"
          value={value3}
          onChange={setValue3}
          min={0}
          max={100}
        >
          <NumericInput.Control>
            <NumericInput.Input />
            <NumericInput.TriggerContainer>
              <NumericInput.IncrementTrigger variant="primary" theme="solid" />
              <NumericInput.DecrementTrigger variant="danger" theme="solid" />
            </NumericInput.TriggerContainer>
          </NumericInput.Control>
        </NumericInput>
      </div>
    </div>
  )
}

export const CustomButtonProps: Story = {
  render: CustomButtonPropsStory,
}
