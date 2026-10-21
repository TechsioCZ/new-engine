import type { Meta, StoryObj } from '@storybook/react'
import { useEffect, useState } from 'react'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { VariantContainer, VariantGroup } from '../../.storybook/decorator'
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
  render: (args) => (
    <div className="mx-auto w-full max-w-sm">
      <Combobox {...args} />
    </div>
  ),
  parameters: {
    controls: { include: ["label", "placeholder", "helpText", "size", "validateStatus", "showHelpTextIcon", "disabled", "readOnly", "required", "multiple", "clearable", "closeOnSelect", "inputBehavior", "selectionBehavior"] },
    layout: 'padded',
    docs: {
      description: {
        component: 'Combobox combines a text input with a keyboard-operable list of suggestions for choosing from long or searchable lists; use Select for short lists that do not need filtering, or SearchSuggestions for catalog navigation.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    id: { control: false, table: { disable: true } },
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
    inputBehavior: {
      control: 'select',
      options: ['autohighlight', 'autocomplete', 'none'],
      description: 'How typing interacts with the highlighted suggestion',
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
  parameters: {
    docs: {
      description: {
        story: 'Explore searchable country selection with working controls; Austria and France demonstrate unavailable options.',
      },
    },
  },
  render: (args) => (
    <div className="mx-auto w-full max-w-sm">
      <Combobox {...args} />
    </div>
  ),
  args: {
    label: 'Select country',
    placeholder: 'Choose a country...',
    items: countries,
    helpText: 'Choose your country of residence; Austria and France are not available yet.',
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
    inputBehavior: 'autocomplete',
    onChange: fn(),
    onInputValueChange: fn(),
    onOpenChange: fn(),
  },
}

export const Sizes: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story: 'Compare small, medium, and large controls to choose a density that matches the surrounding form.',
      },
    },
  },
  render: () => (
    <div className="mx-auto w-full max-w-sm">
      <VariantContainer>
        {(["sm", "md", "lg"] as const).map((size, index) => (
          <VariantGroup key={size} title={["Small (sm)", "Medium (md)", "Large (lg)"][index] ?? "Medium (md)"} fullWidth>
            <Combobox
              label="Country"
              placeholder="Select country"
              items={countries}
              helpText="Choose your country of residence."
              defaultValue="cz"
              size={size}
            />
          </VariantGroup>
        ))}
      </VariantContainer>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const fonts = canvas.getAllByText("Country", { exact: true }).map((label) =>
      Number.parseFloat(getComputedStyle(label).fontSize)
    )
    await expect(fonts).toHaveLength(3)
    await expect(fonts[0]).toBeLessThan(fonts[1] ?? 0)
    await expect(fonts[1]).toBeLessThan(fonts[2] ?? 0)
  },
}

export const ValidationStates: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story: 'Pair each validation treatment with a clear message so the result is understandable without relying on color.',
      },
    },
  },
  render: () => (
    <div className="mx-auto w-full max-w-sm"><VariantContainer>
      <Combobox
        label="Default state"
        placeholder="Select country"
        items={countries}
        closeOnSelect
        helpText="Default state without validation"
      />
      <Combobox
        label="Error state"
        placeholder="Select country"
        items={countries}
        validateStatus="error"
        helpText="Please select a valid country"
      />
      <Combobox
        label="Success state"
        placeholder="Select country"
        items={countries}
        validateStatus="success"
        helpText="Your choice is valid"
      />
      <Combobox
        label="Warning state"
        placeholder="Select country"
        items={countries}
        validateStatus="warning"
        helpText="This country may require additional verification"
      />
    </VariantContainer></div>
  ),
}

export const States: Story = {
  parameters: {
    controls: { disable: true },
    docs: { description: { story: 'Distinguish a locked field from a readable saved value so users understand why a country cannot be edited.' } },
  },
  render: () => (
    <div className="mx-auto grid w-full max-w-sm gap-300">
      <Combobox
        label="Delivery country"
        items={countries}
        disabled
        helpText="Choose a delivery method before selecting a country."
      />
      <Combobox
        label="Billing country"
        items={countries}
        defaultValue="cz"
        readOnly
        helpText="Billing country is managed in your organization settings."
      />
    </div>
  ),
}

export const ControlledStringValue: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story: 'Keep a country selection in application state and clear it externally to demonstrate scalar value normalization.',
      },
    },
  },
  tags: ['ui-runtime-regression'],
  render: () => {
    const [value, setValue] = useState('cz')

    return (
      <div className="mx-auto grid w-full max-w-sm gap-150">
        <Combobox
          label="Controlled country"
          placeholder="Choose a country..."
          items={countries}
          value={value}
          onChange={(nextValue) => {
            setValue(Array.isArray(nextValue) ? (nextValue[0] ?? '') : nextValue)
          }}
        />
        <Button onClick={() => setValue('')}>Clear selection</Button>
        <Combobox
          label="Empty default country"
          placeholder="Choose a country..."
          items={countries}
          defaultValue=""
        />
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole('combobox', { name: 'Controlled country' })

    await waitFor(() => expect(input).toHaveValue('Czech Republic'))
    await expect(
      canvas.getByRole('combobox', { name: 'Empty default country' })
    ).toHaveValue('')
    await userEvent.click(canvas.getByRole('button', { name: 'Clear selection' }))

    await waitFor(() => {
      expect(input).toHaveValue('')
      expect(canvas.queryByRole('button', { name: 'Clear value' })).toBeNull()
    })
  },
}

export const MultipleSelection: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story: 'Choose several countries and remove them using named buttons so every selected value stays visible and keyboard removable.',
      },
    },
  },
  render: () => {
    const [selectedValues, setSelectedValues] = useState<string[]>([])

    const selectedCountries = countries.filter((c) =>
      selectedValues.includes(c.value)
    )

    const removeCountry = (valueToRemove: string) => {
      setSelectedValues((prev) => prev.filter((v) => v !== valueToRemove))
    }

    return (
      <div className="mx-auto w-full max-w-sm space-y-200">
        {selectedCountries.length > 0 && (
          <div className="flex flex-wrap gap-100">
            {selectedCountries.map((country) => (
              <span
                key={country.value}
                className="inline-flex items-center gap-50 rounded-full bg-surface px-150 py-50 text-sm"
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
                  <Icon icon="icon-[mdi--close]" />
                </Button>
              </span>
            ))}
          </div>
        )}
        <Combobox
          label="Select countries"
          placeholder="Choose countries..."
          items={countries}
          value={selectedValues}
          multiple
          selectionBehavior="clear"
          closeOnSelect={false}
          helpText="Choose all applicable countries; Austria and France are not available yet."
          onChange={(value) => {
            setSelectedValues(Array.isArray(value) ? value : [value])
          }}
        />
      </div>
    )
  },
}

export const ComplexStory: Story = {
  name: 'Selection validation',
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story: 'Select a country to see contextual validation feedback change as eligibility rules are applied.',
      },
    },
  },
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
      <div className="mx-auto w-full max-w-sm space-y-300">
        <Combobox
          label="Country of residence"
          placeholder="Choose a country..."
          items={countries}
          onChange={(value) => {
            const singleValue = Array.isArray(value) ? value[0] : value
            setSelectedCountryValue(singleValue ?? null)
          }}
          validateStatus={validateStatus}
          helpText={dynamicHelpText}
        />
        <div className="text-sm">
          Try selecting different countries to see validation states change:
          <ul className="mt-100 ms-250 list-disc">
            <li>USA - error</li>
            <li>Slovakia - warning</li>
            <li>Czech Republic - success</li>
          </ul>
        </div>
      </div>
    )
  },
}

export const Grouped: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Organize countries by region so a longer list is easier to scan while preserving keyboard navigation.',
      },
    },
  },
  args: {
    label: 'Select country',
    placeholder: 'Choose a country...',
    defaultOpen: true,
    groups: [
      {
        id: 'europe',
        label: 'Europe',
        items: [
          { value: 'cz', label: 'Czech Republic' },
          { value: 'de', label: 'Germany' },
        ],
      },
      {
        id: 'north-america',
        label: 'North America',
        items: [{ value: 'us', label: 'USA' }],
      },
    ],
    onChange: fn(),
  },
}

export const ExternalFiltering: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story: 'Simulate a debounced remote search with loading feedback and cancellation of stale queries.',
      },
    },
  },
  render: () => <ExternalFilteringExample />,
}

function ExternalFilteringExample() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ComboboxItem[]>(countries)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setResults(
        countries.filter((country) =>
          country.label.toLowerCase().includes(query.toLowerCase())
        )
      )
      setLoading(false)
    }, 500)
    return () => clearTimeout(timeout)
  }, [query])

  const handleInput = (value: string) => {
    setQuery(value)
    setLoading(true)
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <Combobox
        label="Search country (external)"
        placeholder="Type to search..."
        items={results}
        filterBehavior="external"
        loading={loading}
        onInputValueChange={handleInput}
      />
    </div>
  )
}

export const Loading: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Replace pending suggestions with a loading announcement so users cannot select stale results.',
      },
    },
  },
  args: {
    label: 'Loading results',
    placeholder: 'Searching...',
    items: countries.slice(0, 2),
    defaultOpen: true,
    loading: true,
  },
}

export const LoadingWithSelection: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Preserve the current country label while fresh suggestions load without exposing stale options to keyboard selection.',
      },
    },
  },
  args: {
    label: 'Loading with selection',
    items: countries.slice(0, 2),
    defaultValue: ['cz'],
    defaultOpen: true,
    loading: true,
  },
}

export const ErrorRetry: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story: 'Keep search failure and retry feedback next to the field so users can recover without leaving the form.',
      },
    },
  },
  render: () => {
    const [retryCount, setRetryCount] = useState(0)

    return (
      <div className="mx-auto w-full max-w-sm">
        {retryCount > 0 && (
          <p className="mb-200 text-status-text-sm text-fg-secondary">
            Retried {retryCount} time(s)
          </p>
        )}
        <Combobox
          label="Search failed"
          placeholder="Type to search..."
          items={countries.slice(0, 2)}
          defaultOpen
          error="Something went wrong while loading results."
          onRetry={() => setRetryCount((n) => n + 1)}
        />
      </div>
    )
  },
}

const richCountries: ComboboxItem<{ subtitle: string }>[] = [
  { id: '1', label: 'Czech Republic', value: 'cz', data: { subtitle: 'Central Europe' } },
  { id: '2', label: 'Germany', value: 'de', data: { subtitle: 'Western Europe' } },
  { id: '3', label: 'France', value: 'fr', data: { subtitle: 'Western Europe' } },
]

export const RichItem: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story: 'Show a country icon and secondary region label with state-aware foregrounds that remain readable when selected or highlighted.',
      },
    },
  },
  render: () => (
    <div className="mx-auto w-full max-w-sm">
      <Combobox
        label="Country with details"
        placeholder="Select a country..."
        items={richCountries}
        defaultOpen
        defaultValue="cz"
        closeOnSelect={false}
        helpText="Type to filter, or use the arrow keys to compare countries."
        renderItem={(item) => (
          <div className="flex min-w-0 flex-1 items-center gap-150">
            <Icon icon="icon-[mdi--earth]" size="md" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate">{item.label}</span>
              <span className="text-combobox-item-fg-secondary text-sm">{item.data?.subtitle}</span>
            </div>
          </div>
        )}
      />
    </div>
  ),
}


export const NativeFormValues: Story = {
  parameters: { docs: { description: { story: "Single and multiple selections submit their item values, including read-only fields, while disabled fields submit nothing." } } },
  render: () => (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-300">
      <form aria-label="Single selection" onSubmit={(event) => event.preventDefault()}>
        <Combobox items={countries} label="Country" name="country" defaultValue="us" />
      </form>
      <form aria-label="Multiple selection" onSubmit={(event) => event.preventDefault()}>
        <Combobox items={countries} label="Delivery countries" name="country" multiple defaultValue={["us", "de"]} />
      </form>
      <form aria-label="Read-only selection" onSubmit={(event) => event.preventDefault()}>
        <Combobox items={countries} label="Saved countries" name="country" multiple defaultValue={["us", "de"]} readOnly />
      </form>
      <form aria-label="Disabled selection" onSubmit={(event) => event.preventDefault()}>
        <Combobox items={countries} label="Unavailable country" name="country" defaultValue="us" disabled />
      </form>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(new FormData(canvas.getByRole("form", { name: "Single selection" }) as HTMLFormElement).getAll("country")).toEqual(["us"])
    await expect(new FormData(canvas.getByRole("form", { name: "Multiple selection" }) as HTMLFormElement).getAll("country")).toEqual(["us", "de"])
    await expect(new FormData(canvas.getByRole("form", { name: "Read-only selection" }) as HTMLFormElement).getAll("country")).toEqual(["us", "de"])
    await expect(new FormData(canvas.getByRole("form", { name: "Disabled selection" }) as HTMLFormElement).getAll("country")).toEqual([])
  },
}

export const Disabled: Story = {
  args: { items: countries, label: "Country", defaultValue: "us", disabled: true, helpText: "Country selection is unavailable while the address is syncing." },
  parameters: { docs: { description: { story: "A disabled country field cannot receive focus or participate in form submission." } } },
}

export const ReadOnly: Story = {
  name: "Read-only",
  args: { items: countries, label: "Country", defaultValue: "us", readOnly: true, defaultOpen: true, helpText: "This saved delivery country cannot be changed." },
  parameters: { docs: { description: { story: "A read-only country remains focusable and copyable without opening suggestions or showing mutation affordances." } } },
}

export const ReadOnlyTransition: Story = {
  name: "Read-only transition",
  parameters: {
    controls: { disable: true },
    docs: { description: { story: "Lock an in-progress country search to discard the draft and preserve the selected, submitted country, including with a controlled query." } },
  },
  render: () => {
    const [readOnly, setReadOnly] = useState(false)
    const [query, setQuery] = useState("Czech Republic")
    return (
      <form className="mx-auto grid w-full max-w-sm gap-150" aria-label="Saved delivery countries" onSubmit={(event) => event.preventDefault()}>
        <Button variant="secondary" onPointerDown={(event) => event.preventDefault()} onClick={() => setReadOnly((current) => !current)}>{readOnly ? "Unlock countries" : "Lock countries"}</Button>
        <Combobox inputBehavior="none" items={countries} label="Delivery country" name="country" defaultValue="cz" readOnly={readOnly} />
        <Combobox inputBehavior="none" items={countries} label="Controlled delivery country" name="controlledCountry" value="cz" inputValue={query} onInputValueChange={setQuery} readOnly={readOnly} />
      </form>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("combobox", { name: "Delivery country" })
    const controlled = canvas.getByRole("combobox", { name: "Controlled delivery country" })
    const form = canvas.getByRole("form") as HTMLFormElement
    for (const target of [input, controlled]) {
      await userEvent.clear(target)
      await userEvent.type(target, "Germ")
      await expect(target).toHaveValue("Germ")
      await userEvent.click(canvas.getByRole("button", { name: "Lock countries" }))
      await waitFor(() => expect(target).toHaveValue("Czech Republic"))
      await expect(target).toHaveAttribute("readonly")
      await expect(new FormData(form).getAll("country")).toEqual(["cz"])
      await expect(new FormData(form).getAll("controlledCountry")).toEqual(["cz"])
      await waitFor(() => expect(within(document.body).queryByRole("listbox")).toBeNull())
      await expect(canvas.queryByRole("button", { name: "Clear value" })).toBeNull()
      await userEvent.click(canvas.getByRole("button", { name: "Unlock countries" }))
      await waitFor(() => expect(target).toHaveValue("Czech Republic"))
    }
  },
}

export const RequiredSelection: Story = {
  parameters: {
    controls: { disable: true },
    docs: { description: { story: "Native required validation checks selected countries rather than search text, allowing selected multiple values even when the query is empty." } },
  },
  render: () => (
    <form className="mx-auto grid w-full max-w-sm gap-150" aria-label="Required delivery countries" onSubmit={(event) => event.preventDefault()}>
      <Combobox inputBehavior="none" items={countries} label="Required country" name="country" required />
      <Combobox inputBehavior="none" items={countries} label="Required countries" name="countries" multiple selectionBehavior="clear" required />
    </form>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(document.body)
    const single = canvas.getByRole("combobox", { name: /^Required country/ }) as HTMLInputElement
    const multiple = canvas.getByRole("combobox", { name: /^Required countries/ }) as HTMLInputElement
    const form = canvas.getByRole("form") as HTMLFormElement
    await expect(single.checkValidity()).toBe(false)
    await userEvent.type(single, "Not a country")
    await expect(single.checkValidity()).toBe(false)
    await expect(new FormData(form).get("country")).toBe("")
    await userEvent.clear(single)
    await userEvent.type(single, "Czech")
    await userEvent.click(await body.findByRole("option", { name: "Czech Republic" }))
    await waitFor(() => expect(single.checkValidity()).toBe(true))
    for (const country of ["Czech Republic", "Germany"]) {
      await userEvent.type(multiple, country)
      await userEvent.click(await body.findByRole("option", { name: country }))
      await waitFor(() => expect(multiple).toHaveValue(""))
    }
    await expect(new FormData(form).getAll("countries")).toEqual(["cz", "de"])
    await expect(multiple.checkValidity()).toBe(true)
    await expect(form.checkValidity()).toBe(true)
    await userEvent.click(within(multiple.parentElement as HTMLElement).getByRole("button", { name: "Clear value" }))
    await waitFor(() => expect(multiple.checkValidity()).toBe(false))
    await expect(new FormData(form).getAll("countries")).toEqual([""])
  },
}
