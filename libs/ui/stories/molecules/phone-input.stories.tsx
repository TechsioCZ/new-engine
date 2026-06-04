import type { Meta, StoryObj } from "@storybook/react"
import type { ComponentProps } from "react"
import { useState } from "react"
import { fn } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Button } from "../../src/atoms/button"
import { Icon } from "../../src/atoms/icon"
import {
  PhoneInput,
  type PhoneInputCountry,
  type PhoneInputValueChangeDetails,
  usePhoneInputContext,
} from "../../src/molecules/phone-input"

const countries: PhoneInputCountry[] = [
  {
    value: "SK",
    label: "Slovakia",
    name: "Slovakia",
    flag: <Icon icon="icon-[twemoji--flag-slovakia]" size="md" />,
  },
  {
    value: "CZ",
    label: "Czechia",
    name: "Czechia",
    flag: <Icon icon="icon-[twemoji--flag-czechia]" size="md" />,
  },
  {
    value: "HU",
    label: "Hungary",
    name: "Hungary",
    flag: <Icon icon="icon-[twemoji--flag-hungary]" size="md" />,
  },
  {
    value: "RO",
    label: "Romania",
    name: "Romania",
    flag: <Icon icon="icon-[twemoji--flag-romania]" size="md" />,
  },
  {
    value: "PL",
    label: "Poland",
    name: "Poland",
    flag: <Icon icon="icon-[twemoji--flag-poland]" size="md" />,
  },
  {
    value: "AT",
    label: "Austria",
    name: "Austria",
    flag: <Icon icon="icon-[twemoji--flag-austria]" size="md" />,
  },
  {
    value: "DE",
    label: "Germany",
    name: "Germany",
    flag: <Icon icon="icon-[twemoji--flag-germany]" size="md" />,
  },
]

const limitedCountries = countries
  .filter((item) => ["SK", "CZ", "PL"].includes(item.value))
  .map((item) => (item.value === "PL" ? { ...item, disabled: true } : item))

const czechCountries = countries.filter((item) => item.value === "CZ")
const trackPhoneValueChange = fn()
const trackNativeFormSubmit = fn()

const meta: Meta<typeof PhoneInput> = {
  title: "Molecules/PhoneInput",
  component: PhoneInput,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
A compound phone input for international checkout and account forms.

It keeps the visible input ergonomic for users, emits formatted phone details through \`onValueChange\`, and submits E.164 through the hidden \`name\` input once the number is valid. Invalid draft values are either blocked by \`nativeValidation\` or submitted as typed for custom/server validation. The \`value\` prop is the visible draft value; use \`details.e164\` for the canonical phone number.

## Sub-components
- \`PhoneInput\` - Root wrapper and state owner
- \`PhoneInput.Label\` - Field label
- \`PhoneInput.Control\` - Shared bordered control
- \`PhoneInput.CountryPicker\` - Ready-made country trigger and list
- \`PhoneInput.CountrySelect\` - Country select root for custom composition
- \`PhoneInput.CountryControl\` - Country trigger control
- \`PhoneInput.CountryTrigger\` - Country dropdown trigger
- \`PhoneInput.CountryValue\`, \`CountryFlag\`, \`CountryCallingCode\` - Trigger value slots
- \`PhoneInput.Input\` - Telephone input
- \`PhoneInput.CountryPositioner\`, \`CountryContent\`, \`CountryItem\` - Custom country list composition
- \`PhoneInput.StatusText\` - Helper or validation text
        `,
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: { type: "select" },
      options: ["sm", "md", "lg"],
      description: "Size of the phone input",
      table: { defaultValue: { summary: "md" } },
    },
    validateStatus: {
      control: { type: "select" },
      options: ["default", "error", "success", "warning"],
      description: "Validation status",
      table: { defaultValue: { summary: "default" } },
    },
    disabled: {
      control: "boolean",
      description: "Disable country selection and text entry",
    },
    readOnly: {
      control: "boolean",
      description: "Make the phone input read-only",
    },
    required: {
      control: "boolean",
      description: "Mark the field as required",
    },
    nativeValidation: {
      control: "boolean",
      description: "Use native form validation for invalid non-empty numbers",
    },
    nativeValidationMessage: {
      control: "text",
      description: "Message shown by native validation for invalid numbers",
    },
  },
  args: {
    countries,
    defaultCountry: "SK",
    size: "md",
    validateStatus: "default",
    disabled: false,
    readOnly: false,
    required: false,
    onValueChange: trackPhoneValueChange,
  },
}

export default meta
type Story = StoryObj<typeof PhoneInput>

function PhoneInputExample({
  helpText = "Use a number we can reach for delivery updates.",
  label = "Phone number",
  ...props
}: ComponentProps<typeof PhoneInput> & {
  helpText?: string
  label?: string
}) {
  return (
    <div className="w-2xs max-w-full">
      <PhoneInput {...props}>
        <PhoneInput.Label>{label}</PhoneInput.Label>
        <PhoneInput.Control>
          <PhoneInput.CountryPicker />
          <PhoneInput.Input placeholder="900 123 456" />
        </PhoneInput.Control>
        <PhoneInput.StatusText>{helpText}</PhoneInput.StatusText>
      </PhoneInput>
    </div>
  )
}

type PhoneInputCountryItemsProps = {
  showFlags?: boolean
}

function PhoneInputCountryItems({
  showFlags = true,
}: PhoneInputCountryItemsProps) {
  const { countries: contextCountries } = usePhoneInputContext()

  return (
    <>
      {contextCountries.map((item) => (
        <PhoneInput.CountryItem item={item} key={item.value}>
          <PhoneInput.CountryItemText>
            <span className="flex min-w-0 items-center gap-150">
              {showFlags && <PhoneInput.CountryFlag item={item} />}
              <span className="truncate">{item.label}</span>
            </span>
          </PhoneInput.CountryItemText>
          <PhoneInput.CountryItemMeta />
        </PhoneInput.CountryItem>
      ))}
    </>
  )
}

function PhoneInputDetailsPanel({
  details,
}: {
  details: PhoneInputValueChangeDetails | null
}) {
  return (
    <div className="rounded-md border border-border-primary bg-surface p-200 text-sm">
      <div>E.164: {details?.e164 || "None"}</div>
      <div>Country: {details?.country || "SK"}</div>
      <div>Valid: {details?.isValid ? "yes" : "no"}</div>
    </div>
  )
}

export const Playground: Story = {
  render: (args) => <PhoneInputExample {...args} />,
}

export const WithDefaultValue: Story = {
  args: {
    defaultValue: "+421900123456",
  },
  render: (args) => <PhoneInputExample {...args} />,
}

export const Sizes: Story = {
  render: (args) => (
    <VariantContainer>
      <VariantGroup fullWidth title="Sizes">
        {(["sm", "md", "lg"] as const).map((size) => (
          <PhoneInputExample
            {...args}
            helpText={`${size.toUpperCase()} phone input`}
            key={size}
            label={`Phone number ${size}`}
            size={size}
          />
        ))}
      </VariantGroup>
    </VariantContainer>
  ),
}

export const ValidationStates: Story = {
  render: (args) => (
    <VariantContainer>
      <VariantGroup fullWidth title="Validation">
        <PhoneInputExample
          {...args}
          helpText="This phone number is required."
          label="Error"
          validateStatus="error"
        />
        <PhoneInputExample
          {...args}
          defaultValue="+421900123456"
          helpText="Phone number looks valid."
          label="Success"
          validateStatus="success"
        />
        <PhoneInputExample
          {...args}
          helpText="Double-check the country prefix."
          label="Warning"
          validateStatus="warning"
        />
      </VariantGroup>
    </VariantContainer>
  ),
}

export const DisabledAndReadOnly: Story = {
  render: (args) => (
    <VariantContainer>
      <VariantGroup fullWidth title="Interactivity">
        <PhoneInputExample
          {...args}
          defaultValue="+421900123456"
          disabled
          helpText="Disabled field"
          label="Disabled"
        />
        <PhoneInputExample
          {...args}
          defaultValue="+420777123456"
          defaultCountry="CZ"
          helpText="Read-only field"
          label="Read-only"
          readOnly
        />
      </VariantGroup>
    </VariantContainer>
  ),
}

export const CountryDisplayVariants: Story = {
  render: (args) => (
    <VariantContainer>
      <VariantGroup fullWidth title="Default">
        <PhoneInputExample
          {...args}
          helpText="Country trigger shows the flag and calling code."
          label="Flag and calling code"
        />
      </VariantGroup>
      <VariantGroup fullWidth title="No flags">
        <div className="w-2xs max-w-full">
          <PhoneInput {...args}>
            <PhoneInput.Label>Calling code only</PhoneInput.Label>
            <PhoneInput.Control>
              <PhoneInput.CountrySelect>
                <PhoneInput.CountryControl>
                  <PhoneInput.CountryTrigger className="max-w-24">
                    <PhoneInput.CountryValue>
                      <PhoneInput.CountryCallingCode />
                    </PhoneInput.CountryValue>
                  </PhoneInput.CountryTrigger>
                </PhoneInput.CountryControl>
                <PhoneInput.CountryPositioner>
                  <PhoneInput.CountryContent>
                    <PhoneInputCountryItems showFlags={false} />
                  </PhoneInput.CountryContent>
                </PhoneInput.CountryPositioner>
              </PhoneInput.CountrySelect>
              <PhoneInput.Input placeholder="900 123 456" />
            </PhoneInput.Control>
            <PhoneInput.StatusText>
              Country list stays searchable without flag icons.
            </PhoneInput.StatusText>
          </PhoneInput>
        </div>
      </VariantGroup>
      <VariantGroup fullWidth title="Flag only trigger">
        <div className="w-2xs max-w-full">
          <PhoneInput {...args}>
            <PhoneInput.Label>Compact country trigger</PhoneInput.Label>
            <PhoneInput.Control>
              <PhoneInput.CountrySelect>
                <PhoneInput.CountryControl>
                  <PhoneInput.CountryTrigger aria-label="Select country" className="max-w-fit">
                    <PhoneInput.CountryValue>
                      <PhoneInput.CountryFlag />
                    </PhoneInput.CountryValue>
                  </PhoneInput.CountryTrigger>
                </PhoneInput.CountryControl>
                <PhoneInput.CountryPositioner>
                  <PhoneInput.CountryContent>
                    <PhoneInputCountryItems />
                  </PhoneInput.CountryContent>
                </PhoneInput.CountryPositioner>
              </PhoneInput.CountrySelect>
              <PhoneInput.Input placeholder="900 123 456" />
            </PhoneInput.Control>
            <PhoneInput.StatusText>
              Compact trigger keeps the full country details in the list.
            </PhoneInput.StatusText>
          </PhoneInput>
        </div>
      </VariantGroup>
    </VariantContainer>
  ),
}

export const FixedCountry: Story = {
  render: (args) => (
    <div className="w-2xs max-w-full">
      <PhoneInput {...args} countries={czechCountries} defaultCountry="CZ">
        <PhoneInput.Label>Czech phone number</PhoneInput.Label>
        <PhoneInput.Control>
          <PhoneInput.CountryValue className="shrink-0 px-150">
            <PhoneInput.CountryFlag />
            <PhoneInput.CountryCallingCode />
          </PhoneInput.CountryValue>
          <PhoneInput.Input placeholder="777 123 456" />
        </PhoneInput.Control>
        <PhoneInput.StatusText>
          Use this when the country is fixed by checkout market.
        </PhoneInput.StatusText>
      </PhoneInput>
    </div>
  ),
}

export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = useState("")
    const [details, setDetails] =
      useState<PhoneInputValueChangeDetails | null>(null)

    return (
      <div className="grid w-sm max-w-full gap-200">
        <PhoneInputExample
          {...args}
          helpText={details?.isValid ? "Valid phone number" : "Keep typing"}
          label="Controlled phone"
          onValueChange={(nextDetails) => {
            args.onValueChange?.(nextDetails)
            setValue(nextDetails.value)
            setDetails(nextDetails)
          }}
          validateStatus={details?.isValid ? "success" : "default"}
          value={value}
        />
        <PhoneInputDetailsPanel details={details} />
      </div>
    )
  },
}

export const AsyncControlledValue: Story = {
  render: (args) => {
    const [value, setValue] = useState("")

    return (
      <div className="grid w-sm max-w-full gap-200">
        <PhoneInputExample
          {...args}
          helpText={
            value
              ? "Profile phone value is loaded into the controlled input."
              : "Load a saved profile phone into the controlled input."
          }
          label="Profile phone"
          value={value}
          onValueChange={(nextDetails) => {
            args.onValueChange?.(nextDetails)
            setValue(nextDetails.value)
          }}
        />
        <Button onClick={() => setValue("+420777123456")} type="button">
          Load profile phone
        </Button>
      </div>
    )
  },
}

export const PasteInternationalNumber: Story = {
  render: (args) => {
    const [value, setValue] = useState("")

    return (
      <div className="grid w-sm max-w-full gap-200">
        <PhoneInputExample
          {...args}
          defaultCountry="SK"
          helpText="Apply an international value and the country syncs from it."
          label="International paste"
          value={value}
          onValueChange={(nextDetails) => {
            args.onValueChange?.(nextDetails)
            setValue(nextDetails.value)
          }}
        />
        <Button onClick={() => setValue("+420777123456")} type="button">
          Paste Czech number
        </Button>
      </div>
    )
  },
}

export const LimitedCountries: Story = {
  render: (args) => (
    <PhoneInputExample
      {...args}
      countries={limitedCountries}
      helpText="Only enabled markets can be selected or auto-synced."
      label="Market phone"
    />
  ),
}

export const CustomCountryList: Story = {
  render: (args) => (
    <div className="w-sm max-w-full">
      <PhoneInput {...args}>
        <PhoneInput.Label>Delivery phone</PhoneInput.Label>
        <PhoneInput.Control>
          <PhoneInput.CountrySelect>
            <PhoneInput.CountryControl className="border-phone-input-divider border-r">
              <PhoneInput.CountryTrigger className="min-w-24">
                <PhoneInput.CountryValue>
                  <PhoneInput.CountryCallingCode />
                </PhoneInput.CountryValue>
              </PhoneInput.CountryTrigger>
            </PhoneInput.CountryControl>
            <PhoneInput.CountryPositioner>
              <PhoneInput.CountryContent>
                {countries.map((item) => (
                  <PhoneInput.CountryItem item={item} key={item.value}>
                    <PhoneInput.CountryItemText>
                      <span className="flex min-w-0 items-center gap-150">
                        <span className="font-semibold">{item.value}</span>
                        <span className="truncate">{item.label}</span>
                      </span>
                    </PhoneInput.CountryItemText>
                    <PhoneInput.CountryItemMeta />
                  </PhoneInput.CountryItem>
                ))}
              </PhoneInput.CountryContent>
            </PhoneInput.CountryPositioner>
          </PhoneInput.CountrySelect>
          <PhoneInput.Input placeholder="900 123 456" />
        </PhoneInput.Control>
        <PhoneInput.StatusText>
          Country rows can be fully customized.
        </PhoneInput.StatusText>
      </PhoneInput>
    </div>
  ),
}

export const NativeFormValue: Story = {
  render: (args) => {
    const [submittedValue, setSubmittedValue] = useState("None")

    return (
      <form
        className="grid w-sm max-w-full gap-200"
        onSubmit={(event) => {
          event.preventDefault()
          const formData = new FormData(event.currentTarget)
          const phone = String(formData.get("phone") || "None")
          trackNativeFormSubmit(phone)
          setSubmittedValue(phone)
        }}
      >
        <PhoneInputExample
          {...args}
          helpText="Submit to inspect the hidden E.164 form value."
          label="Native form phone"
          name="phone"
          nativeValidation
          nativeValidationMessage="Enter a valid delivery phone number."
          required
        />
        <Button type="submit">Submit</Button>
        <div className="rounded-md border border-border-primary bg-surface p-200 text-sm">
          Submitted: {submittedValue}
        </div>
      </form>
    )
  },
}
