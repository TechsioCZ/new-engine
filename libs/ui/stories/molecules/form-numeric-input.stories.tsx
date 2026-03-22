import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { NumericInput } from '../../src/atoms/numeric-input'
import { FormNumericInput } from '../../src/molecules/form-numeric-input'

const meta: Meta<typeof FormNumericInput> = {
  title: 'Molecules/FormNumericInput',
  component: FormNumericInput,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Form wrapper for NumericInput. Provides Label, validation state, and help text while maintaining full compound pattern flexibility.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    // Text inputs
    label: {
      control: 'text',
      description: 'Label for the numeric input',
    },
    helpText: {
      control: 'text',
      description: 'Help text displayed below the input',
    },

    // Appearance
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the numeric input',
      table: { defaultValue: { summary: 'md' } },
    },
    validateStatus: {
      control: 'select',
      options: ['default', 'error', 'success', 'warning'],
      description: 'Validation status of the numeric input',
      table: { defaultValue: { summary: 'default' } },
    },
    showHelpTextIcon: {
      control: 'boolean',
      description:
        'Whether to show an icon with the help text. Defaults to true when validateStatus is not "default".',
      table: { defaultValue: { summary: 'auto (true when validated)' } },
    },

    // States
    disabled: {
      control: 'boolean',
      description: 'Disable the numeric input',
      table: { defaultValue: { summary: 'false' } },
    },
    required: {
      control: 'boolean',
      description: 'Mark as required field',
      table: { defaultValue: { summary: 'false' } },
    },

    // Numeric options
    min: {
      control: 'number',
      description: 'Minimum allowed value',
    },
    max: {
      control: 'number',
      description: 'Maximum allowed value',
    },
    step: {
      control: 'number',
      description: 'Step increment value',
      table: { defaultValue: { summary: '1' } },
    },
    precision: {
      control: 'number',
      description: 'Number of decimal places',
    },

    // Behavior
    allowMouseWheel: {
      control: 'boolean',
      description: 'Allow changing value with mouse wheel',
      table: { defaultValue: { summary: 'true' } },
    },
    allowOverflow: {
      control: 'boolean',
      description: 'Allow values outside min/max range',
      table: { defaultValue: { summary: 'false' } },
    },
    clampValueOnBlur: {
      control: 'boolean',
      description: 'Clamp value to min/max when input loses focus',
      table: { defaultValue: { summary: 'true' } },
    },
    spinOnPress: {
      control: 'boolean',
      description: 'Continue incrementing/decrementing while button is held',
      table: { defaultValue: { summary: 'true' } },
    },
    readOnly: {
      control: 'boolean',
      description: 'Make input read-only',
      table: { defaultValue: { summary: 'false' } },
    },
    locale: {
      control: 'text',
      description: 'Locale for number formatting',
      table: { defaultValue: { summary: 'cs-CZ' } },
    },
  },
  args: {
    label: 'Quantity',
    helpText: 'Enter a value between 0 and 100',
    size: 'md',
    validateStatus: 'default',
    showHelpTextIcon: false,
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
    locale: 'cs-CZ',
  },
}

export default meta
type Story = StoryObj<typeof FormNumericInput>

// Playground - Interactive with Controls
export const Playground: Story = {
  args: {
    label: 'Playground NumericInput',
  },
  render: (args) => {
    return (
      <div className="w-md">
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
    )
  },
}

// With Error - Shows validation error state
export const WithError: Story = {
  render: () => {
    const [value, setValue] = useState(150)
    const isInvalid = value < 0 || value > 100

    return (
      <div className="w-md">
        <FormNumericInput
          id="quantity-error"
          label="Quantity"
          value={value}
          onChange={setValue}
          min={0}
          max={100}
          validateStatus={isInvalid ? 'error' : 'default'}
          helpText={isInvalid ? 'Value must be between 0 and 100' : undefined}
          allowOverflow
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

// Validation States - Shows all validation states
export const ValidationStates: Story = {
  render: () => {
    const [value1, setValue1] = useState(25)
    const [value2, setValue2] = useState(50)
    const [value3, setValue3] = useState(75)
    const [value4, setValue4] = useState(100)

    return (
      <div className="flex flex-col gap-300">
        <div className="w-md">
          <FormNumericInput
            id="quantity-default"
            label="Default State"
            value={value1}
            onChange={setValue1}
            min={0}
            max={100}
            helpText="Enter a value between 0 and 100"
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

        <div className="w-md">
          <FormNumericInput
            id="quantity-error"
            label="Error State"
            value={value2}
            onChange={setValue2}
            min={0}
            max={100}
            validateStatus="error"
            helpText="Value must be between 0 and 100"
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

        <div className="w-md">
          <FormNumericInput
            id="quantity-success"
            label="Success State"
            value={value3}
            onChange={setValue3}
            min={0}
            max={100}
            validateStatus="success"
            helpText="Quantity is valid"
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

        <div className="w-md">
          <FormNumericInput
            id="quantity-warning"
            label="Warning State"
            value={value4}
            onChange={setValue4}
            min={0}
            max={100}
            validateStatus="warning"
            helpText="Quantity is at maximum limit"
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
export const Required: Story = {
  render: () => {
    const [value, setValue] = useState(0)

    return (
      <div className="w-md">
        <FormNumericInput
          id="quantity-required"
          label="Quantity"
          value={value}
          onChange={setValue}
          min={0}
          max={100}
          required
          helpText="This field is required"
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
export const Disabled: Story = {
  render: () => {
    return (
      <div className="w-md">
        <FormNumericInput
          id="quantity-disabled"
          label="Quantity"
          defaultValue={42}
          disabled
          helpText="This field is disabled"
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

// Horizontal Layout - Triggers beside input
export const HorizontalLayout: Story = {
  render: () => {
    const [value, setValue] = useState(50)

    return (
      <div className="w-md">
        <FormNumericInput
          id="quantity-horizontal"
          label="Quantity"
          value={value}
          onChange={setValue}
          min={0}
          max={100}
          helpText="Horizontal layout example"
        >
          <div className="flex gap-100">
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
        </FormNumericInput>
      </div>
    )
  },
}

// Without Triggers - Keyboard and wheel control only
export const WithoutTriggers: Story = {
  render: () => {
    const [value, setValue] = useState(50)

    return (
      <div className="w-md">
        <FormNumericInput
          id="quantity-no-triggers"
          label="Quantity"
          value={value}
          onChange={setValue}
          min={0}
          max={100}
          allowMouseWheel
          helpText="Use arrow keys or mouse wheel to change value"
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
  render: () => {
    const [value, setValue] = useState(50)

    return (
      <div className="w-md">
        <FormNumericInput
          id="quantity-scrubber"
          label="Quantity"
          value={value}
          onChange={setValue}
          min={0}
          max={100}
          step={5}
          helpText="Drag left/right on the input to change value"
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
export const AllSizes: Story = {
  render: () => {
    const [value1, setValue1] = useState(10)
    const [value2, setValue2] = useState(20)
    const [value3, setValue3] = useState(30)

    return (
      <div className="flex flex-col gap-300">
        <div className="w-md">
          <FormNumericInput
            id="quantity-sm"
            label="Small Size"
            size="sm"
            value={value1}
            onChange={setValue1}
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
          </FormNumericInput>
        </div>

        <div className="w-md">
          <FormNumericInput
            id="quantity-md"
            label="Medium Size"
            size="md"
            value={value2}
            onChange={setValue2}
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
          </FormNumericInput>
        </div>

        <div className="w-md">
          <FormNumericInput
            id="quantity-lg"
            label="Large Size"
            size="lg"
            value={value3}
            onChange={setValue3}
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
          </FormNumericInput>
        </div>
      </div>
    )
  },
}

// With Precision - Decimal values
export const WithPrecision: Story = {
  render: () => {
    const [value, setValue] = useState(3.14)

    return (
      <div className="w-md">
        <FormNumericInput
          id="quantity-precision"
          label="Pi Approximation"
          value={value}
          onChange={setValue}
          min={0}
          max={10}
          step={0.1}
          precision={2}
          helpText="Supports 2 decimal places"
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
  render: () => {
    const [value, setValue] = useState(50)
    const isInvalid = value < 0 || value > 100

    return (
      <div className="flex flex-col">
        <div>
          <FormNumericInput
            id="quantity-complex"
            label="Product Quantity"
            value={value}
            onChange={setValue}
            min={0}
            max={100}
            step={5}
            required
            validateStatus={isInvalid ? 'error' : 'default'}
            helpText={
              isInvalid
                ? 'Value must be between 0 and 100'
                : 'Adjust quantity using buttons, arrow keys, or mouse wheel'
            }
            allowMouseWheel
            clampValueOnBlur
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

        <div className="bg-surface-secondary rounded-md">
          <h3 className="text-fg-primary font-semibold mb-100">Current State</h3>
          <ul className="text-fg-muted text-sm space-y-050">
            <li>
              Value: <strong>{value}</strong>
            </li>
            <li>
              Status:{' '}
              <strong className={isInvalid ? 'text-danger' : 'text-success'}>
                {isInvalid ? 'Invalid' : 'Valid'}
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
