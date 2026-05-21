import type { Meta, StoryObj } from "@storybook/react"
import type { ComponentProps } from "react"
import { useState } from "react"
import { Icon } from "../../src/atoms/icon"
import {
  PhoneInput,
  type PhoneInputCountry,
  type PhoneInputValueChangeDetails,
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


const meta: Meta<typeof PhoneInput> = {
  title: "Molecules/PhoneInput",
  component: PhoneInput,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
A compound phone input for international checkout and account forms.

It keeps the visible input ergonomic for users, emits formatted phone details through \`onValueChange\`, and submits the E.164 number through the hidden \`name\` input when used in native forms.

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
  },
  args: {
    countries,
    defaultCountry: "SK",
    size: "md",
    validateStatus: "default",
    disabled: false,
    readOnly: false,
    required: false,
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
    <div className="w-3xs max-w-full">
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

export const Basic: Story = {
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
    <div className="grid w-sm max-w-full gap-300">
      {(["sm", "md", "lg"] as const).map((size) => (
        <PhoneInputExample
          {...args}
          helpText={`${size.toUpperCase()} phone input`}
          key={size}
          label={`Phone number ${size}`}
          size={size}
        />
      ))}
    </div>
  ),
}

export const ValidationStates: Story = {
  render: (args) => (
    <div className="grid w-sm max-w-full gap-300">
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
    </div>
  ),
}

export const DisabledAndReadOnly: Story = {
  render: (args) => (
    <div className="grid w-sm max-w-full gap-300">
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
            setValue(nextDetails.value)
            setDetails(nextDetails)
          }}
          validateStatus={details?.isValid ? "success" : "default"}
          value={value}
        />
        <div className="rounded-md border border-border-primary bg-surface p-200 text-sm">
          <div>E.164: {details?.e164 || "None"}</div>
          <div>Country: {details?.country || "SK"}</div>
          <div>Valid: {details?.isValid ? "yes" : "no"}</div>
        </div>
      </div>
    )
  },
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
          setSubmittedValue(String(formData.get("phone") || "None"))
        }}
      >
        <PhoneInputExample
          {...args}
          helpText="Submit to inspect the hidden E.164 form value."
          label="Native form phone"
          name="phone"
          required
        />
        <button
          className="h-form-control-md rounded-button-md bg-button-bg-primary px-300 text-button-fg-primary"
          type="submit"
        >
          Submit
        </button>
        <div className="rounded-md border border-border-primary bg-surface p-200 text-sm">
          Submitted: {submittedValue}
        </div>
      </form>
    )
  },
}
