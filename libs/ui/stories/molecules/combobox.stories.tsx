import type { Meta, StoryObj } from '@storybook/react'
import { useEffect, useState } from 'react'
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

type ProductSuggestion = {
  sku: string
  name: string
  department: string
  available: boolean
}

const remoteProducts: ProductSuggestion[] = [
  {
    sku: 'tea-jasmin-001',
    name: 'Jasmine Green Tea',
    department: 'Tea',
    available: true,
  },
  {
    sku: 'tea-matcha-002',
    name: 'Ceremonial Matcha',
    department: 'Tea',
    available: true,
  },
  {
    sku: 'oil-lavender-003',
    name: 'Lavender Essential Oil',
    department: 'Aromatherapy',
    available: true,
  },
  {
    sku: 'balm-arnica-004',
    name: 'Arnica Recovery Balm',
    department: 'Body care',
    available: false,
  },
  {
    sku: 'soap-sage-005',
    name: 'Clary Sage Soap',
    department: 'Body care',
    available: true,
  },
]

const productAccessors = {
  itemToString: (item: ProductSuggestion) => item.name,
  itemToValue: (item: ProductSuggestion) => item.sku,
  isItemDisabled: (item: ProductSuggestion) => !item.available,
}

function getRemoteProducts(query: string) {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return remoteProducts.slice(0, 3)
  }

  return remoteProducts.filter((item) =>
    `${item.name} ${item.department}`.toLowerCase().includes(normalizedQuery)
  )
}

function ProductOption({
  item,
  label,
}: {
  item: ProductSuggestion
  label: string
}) {
  return (
    <span className="flex flex-col gap-25">
      <span>{label}</span>
      <span className="text-combobox-fg-placeholder text-sm">
        {item.department}
        {!item.available && ' · unavailable'}
      </span>
    </span>
  )
}

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
    autoComplete: {
      control: 'text',
      description: 'Native browser autocomplete token for the text input',
    },
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
    filterMode: {
      control: 'select',
      options: ['local', 'remote'],
      description: 'Filtering mode. Remote mode trusts the items prop.',
      table: { defaultValue: { summary: 'local' } },
    },
    loading: {
      control: 'boolean',
      description: 'Show a loading state inside the list content',
      table: { defaultValue: { summary: 'false' } },
    },
    loadingMessage: {
      control: 'text',
      description: 'Loading state content',
      table: { defaultValue: { summary: 'Loading results...' } },
    },
    error: {
      control: 'text',
      description: 'Remote error content',
    },
    noResultsMessage: {
      control: 'text',
      description: 'Empty state content. {inputValue} is interpolated.',
    },
    renderItem: { table: { disable: true } },
    renderEmptyState: { table: { disable: true } },
    renderLoadingState: { table: { disable: true } },
    renderErrorState: { table: { disable: true } },
    itemToString: { table: { disable: true } },
    itemToValue: { table: { disable: true } },
    isItemDisabled: { table: { disable: true } },
  },
}

export default meta
type Story = StoryObj<typeof Combobox>

export const Playground: Story = {
  args: {
    label: 'Select Country',
    placeholder: 'Choose a country...',
    autoComplete: 'country-name',
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
    filterMode: 'local',
    loading: false,
    loadingMessage: 'Loading results...',
    noResultsMessage: 'No results found for "{inputValue}"',
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

export const RemoteSearch: Story = {
  render: () => {
    const [query, setQuery] = useState('')
    const [items, setItems] = useState(() => getRemoteProducts(''))
    const [loading, setLoading] = useState(false)

    useEffect(() => {
      setLoading(true)

      const timer = window.setTimeout(() => {
        setItems(getRemoteProducts(query))
        setLoading(false)
      }, 500)

      return () => window.clearTimeout(timer)
    }, [query])

    return (
      <div className="w-80">
        <Combobox<ProductSuggestion>
          {...productAccessors}
          filterMode="remote"
          inputValue={query}
          items={items}
          label="Remote product search"
          loading={loading}
          noResultsMessage='No remote matches for "{inputValue}"'
          onInputValueChange={setQuery}
          placeholder="Search catalog..."
          renderItem={({ item, label }) => (
            <ProductOption item={item} label={label} />
          )}
        />
      </div>
    )
  },
}

export const RemoteLoading: Story = {
  render: () => (
    <div className="w-80">
      <Combobox<ProductSuggestion>
        {...productAccessors}
        filterMode="remote"
        inputValue="lavender"
        items={[]}
        label="Loading remote results"
        loading
        loadingMessage="Searching catalog..."
        placeholder="Search catalog..."
      />
    </div>
  ),
}

export const RemoteError: Story = {
  render: () => (
    <div className="w-80">
      <Combobox<ProductSuggestion>
        {...productAccessors}
        error="Search is temporarily unavailable."
        filterMode="remote"
        inputValue="matcha"
        items={[]}
        label="Remote error"
        placeholder="Search catalog..."
        renderErrorState={({ error }) => (
          <span className="text-combobox-danger-fg">{error}</span>
        )}
      />
    </div>
  ),
}

export const RemoteEmpty: Story = {
  render: () => (
    <div className="w-80">
      <Combobox<ProductSuggestion>
        {...productAccessors}
        filterMode="remote"
        inputValue="zzzz"
        items={[]}
        label="Remote empty state"
        placeholder="Search catalog..."
        renderEmptyState={({ inputValue }) => (
          <span>No products match "{inputValue}".</span>
        )}
      />
    </div>
  ),
}

export const Focused: Story = {
  render: () => (
    <div className="w-80">
      <Combobox
        autoFocus
        helpText="The input receives focus when the story mounts."
        items={countries}
        label="Focused combobox"
        placeholder="Type to filter countries"
      />
    </div>
  ),
}

export const MobileWidth: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
  render: () => (
    <div className="w-64">
      <Combobox<ProductSuggestion>
        {...productAccessors}
        filterMode="remote"
        items={remoteProducts.slice(0, 3)}
        label="Mobile search"
        placeholder="Search"
        renderItem={({ item, label }) => (
          <ProductOption item={item} label={label} />
        )}
      />
    </div>
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
