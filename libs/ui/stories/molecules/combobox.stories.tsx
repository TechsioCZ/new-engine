import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { VariantContainer } from '../../.storybook/decorator'
import { Combobox, type ComboboxItem } from '../../src/molecules/combobox'
import { Button } from '../../src/atoms/button'
import { Icon } from '../../src/atoms/icon'

const countries: ComboboxItem[] = [
  { id: '1', label: 'Czech Republic', value: 'cz' },
  { id: '2', label: 'Slovakia', value: 'sk' },
  { id: '3', label: 'Germany', value: 'de' },
  { id: '4', label: 'Austria', value: 'at', disabled: true },
  { id: '5', label: 'Poland', value: 'pl' },
  { id: '6', label: 'France', value: 'fr', disabled: true },
  { id: '7', label: 'Italy', value: 'it' },
  { id: '8', label: 'Spain', value: 'es' },
  { id: '9', label: 'Great Britain', value: 'gb' },
  { id: '10', label: 'USA', value: 'us' },
]

const meta: Meta<typeof Combobox> = {
  title: 'Molecules/Combobox',
  component: Combobox,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    // Text inputs
    label: { control: 'text', description: 'Label text' },
    placeholder: { control: 'text', description: 'Placeholder text' },
    helpText: { control: 'text', description: 'Help text below combobox' },

    // Size and appearance
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size variant',
      table: { defaultValue: { summary: 'md' } },
    },
    validateStatus: {
      control: 'select',
      options: ['default', 'error', 'success', 'warning'],
      description: 'Validation status',
      table: { defaultValue: { summary: 'default' } },
    },
    showHelpTextIcon: {
      control: 'boolean',
      description: 'Show icon with help text',
      table: { defaultValue: { summary: 'true' } },
    },

    // States
    disabled: {
      control: 'boolean',
      description: 'Disable the combobox',
      table: { defaultValue: { summary: 'false' } },
    },
    readOnly: {
      control: 'boolean',
      description: 'Make combobox read-only',
      table: { defaultValue: { summary: 'false' } },
    },
    required: {
      control: 'boolean',
      description: 'Mark as required field',
      table: { defaultValue: { summary: 'false' } },
    },

    // Behavior
    multiple: {
      control: 'boolean',
      description: 'Allow multiple selection',
      table: { defaultValue: { summary: 'false' } },
    },
    clearable: {
      control: 'boolean',
      description: 'Show clear button',
      table: { defaultValue: { summary: 'true' } },
    },
    closeOnSelect: {
      control: 'boolean',
      description: 'Close dropdown on selection',
      table: { defaultValue: { summary: 'true' } },
    },
    selectionBehavior: {
      control: 'select',
      options: ['replace', 'clear', 'preserve'],
      description: 'Selection behavior mode',
      table: { defaultValue: { summary: 'replace' } },
    },
  },
}

export default meta
type Story = StoryObj<typeof Combobox>

export const Playground: Story = {
  args: {
    label: 'Select Country',
    placeholder: 'Choose a country...',
    items: countries,
    helpText: 'Select your country of residence',
    size: 'md',
    validateStatus: 'default',
    showHelpTextIcon: true,
    disabled: false,
    readOnly: false,
    required: false,
    multiple: false,
    clearable: true,
    closeOnSelect: true,
    selectionBehavior: 'replace',
  },
}

export const ValidationStates: Story = {
  render: () => (
    <VariantContainer>
      <Combobox
        label="Default State"
        placeholder="Select country"
        items={countries}
        closeOnSelect
        helpText="Default state without validation"
      />
      <Combobox
        label="Error State"
        placeholder="Select country"
        items={countries}
        validateStatus="error"
        helpText="Please select a valid country"
      />
      <Combobox
        label="Success State"
        placeholder="Select country"
        items={countries}
        validateStatus="success"
        helpText="Your choice is valid"
      />
      <Combobox
        label="Warning State"
        placeholder="Select country"
        items={countries}
        validateStatus="warning"
        helpText="This country may require additional verification"
      />
    </VariantContainer>
  ),
}

export const MultipleSelection: Story = {
  render: () => {
    const [selectedValues, setSelectedValues] = useState<string[]>([])

    const selectedCountries = countries.filter((c) =>
      selectedValues.includes(c.value)
    )

    const removeCountry = (valueToRemove: string) => {
      setSelectedValues((prev) => prev.filter((v) => v !== valueToRemove))
    }

    return (
      <div className="w-80 space-y-4">
        {selectedCountries.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedCountries.map((country) => (
              <span
                key={country.value}
                className="inline-flex items-center gap-50 rounded-full bg-surface p-150 py-50 text-sm"
              >
                {country.label}
                <Button
                  type="button"
                  size="current"
                  theme="unstyled"
                  onClick={() => removeCountry(country.value)}
                  className="bg-surface"
                  aria-label={`Remove ${country.label}`}
                >
                  <Icon icon="icon-[mdi--close]"/>
                </Button>
              </span>
            ))}
          </div>
        )}
        <Combobox
          label="Select Countries"
          placeholder="Choose countries..."
          items={countries}
          value={selectedValues}
          multiple
          selectionBehavior="clear"
          closeOnSelect={false}
          onChange={(value) => {
            setSelectedValues(Array.isArray(value) ? value : [value])
          }}
        />
      </div>
    )
  },
}

export const Sizes: Story = {
  render: () => (
    <VariantContainer>
      <Combobox
        label="Small Size"
        placeholder="Select country"
        items={countries}
        helpText="Small combobox variant"
        size="sm"
      />
      <Combobox
        label="Medium Size"
        placeholder="Select country"
        items={countries}
        helpText="Medium combobox variant (default)"
        size="md"
      />
      <Combobox
        label="Large Size"
        placeholder="Select country"
        items={countries}
        helpText="Large combobox variant"
        size="lg"
      />
    </VariantContainer>
  ),
}

export const ComplexStory: Story = {
  render: () => {
    const [selectedCountryValue, setSelectedCountryValue] = useState<
      string | null
    >(null)

    const validateStatus =
      selectedCountryValue === 'us'
        ? 'error'
        : selectedCountryValue === 'sk'
          ? 'warning'
          : selectedCountryValue === 'cz'
            ? 'success'
            : 'default'

    const dynamicHelpText =
      validateStatus === 'error'
        ? 'USA is currently unavailable'
        : validateStatus === 'warning'
          ? 'Slovakia requires additional identity verification'
          : validateStatus === 'success'
            ? 'Country successfully selected'
            : 'Select your country of residence'

    return (
      <div className="w-72 space-y-8">
        <Combobox
          label="Select Country (Dynamic Validation)"
          placeholder="Choose a country..."
          items={countries}
          onChange={(value) => {
            const singleValue = Array.isArray(value) ? value[0] : value
            setSelectedCountryValue(singleValue ?? null)
          }}
          validateStatus={validateStatus}
          helpText={dynamicHelpText}
        />
        <div className="text-sm ">
          Try selecting different countries to see validation states change:
          <ul className="mt-2 ml-5 list-disc">
            <li>USA - error</li>
            <li>Slovakia - warning</li>
            <li>Czech Republic - success</li>
          </ul>
        </div>
      </div>
    )
  },
}
