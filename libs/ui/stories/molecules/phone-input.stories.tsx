import type { Meta, StoryObj } from "@storybook/react"
import type { ComponentProps } from "react"
import { useId, useMemo, useRef, useState } from "react"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
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
const trackPhoneRef = fn()

const meta: Meta<typeof PhoneInput> = {
  title: "Molecules/PhoneInput",
  component: PhoneInput,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: `
A compound phone input for international checkout and account forms. Use FormInput for other textual identifiers; use a separate country Select only when it represents an independent address field.

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
  countryTriggerProps,
  helpText = "Use a number we can reach for delivery updates.",
  label = "Phone number",
  ...props
}: ComponentProps<typeof PhoneInput> & {
  countryTriggerProps?: ComponentProps<typeof PhoneInput.CountryTrigger>
  helpText?: string
  label?: string
}) {
  return (
    <div className="w-full max-w-2xs">
      <PhoneInput {...props}>
        <PhoneInput.Label>{label}</PhoneInput.Label>
        <PhoneInput.Control>
          <PhoneInput.CountryPicker triggerProps={countryTriggerProps} />
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
  parameters: {
    docs: {
      description: {
        story:
          "Try the live controls and change the available options to find the right configuration for your form.",
      },
    },
  },
  render: (args) => <PhoneInputExample {...args} />,
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
      <VariantGroup fullWidth title="Sizes">
        {(["sm", "md", "lg"] as const).map((size, index) => (
          <VariantGroup
            key={size}
            fullWidth
            title={["Small (sm)", "Medium (md)", "Large (lg)"][index] ?? size}
          >
            <PhoneInputExample
              {...args}
              defaultValue="+421900123456"
              helpText="We will use this number for delivery updates."
              label="Phone number"
              size={size}
            />
          </VariantGroup>
        ))}
      </VariantGroup>
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
  args: { disabled: true, defaultValue: "+421900123456" },
  render: (args) => <PhoneInputExample {...args} />,
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
  args: { readOnly: true, defaultValue: "+421900123456" },
  render: (args) => <PhoneInputExample {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("textbox", {
      name: "Phone number",
    }) as HTMLInputElement
    const value = input.value
    await userEvent.click(input)
    await userEvent.keyboard("123{Backspace}")
    await expect(input).toHaveValue(value)
    await expect(input).toHaveFocus()
    await expect(input).toHaveAttribute("readonly")
    await expect(getComputedStyle(input).cursor).toBe("text")
    const trigger = canvas.getByRole("combobox")
    for (const id of (trigger.getAttribute("aria-labelledby") ?? "")
      .split(/\s+/)
      .filter(Boolean)) {
      await expect(
        canvasElement.ownerDocument.getElementById(id)
      ).not.toBeNull()
    }
  },
}

export const ValidationStates: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Error, warning and success messages include readable text and a status icon associated with the field.",
      },
    },
  },
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

export const AccessibleCountryNames: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Distinct country-picker names distinguish billing and delivery fields, including a caller-provided accessible label.",
      },
    },
  },
  tags: ["ui-semantic-regression"],
  render: (args) => {
    const billingCountryLabelId = useId()

    return (
      <VariantContainer>
        <VariantGroup fullWidth title="Selected country">
          <PhoneInputExample {...args} label="Delivery phone" />
        </VariantGroup>
        <VariantGroup fullWidth title="Localized country">
          <PhoneInputExample
            {...args}
            countries={[
              { value: "SK", label: "Slovensko" },
              { value: "CZ", label: "Česko" },
            ]}
            defaultCountry="CZ"
            label="Localized phone"
          />
        </VariantGroup>
        <VariantGroup fullWidth title="Custom country label">
          <PhoneInputExample
            {...args}
            countryTriggerProps={{ "aria-label": "Country for support phone" }}
            label="Support phone"
          />
        </VariantGroup>
        <VariantGroup fullWidth title="External country label">
          <span id={billingCountryLabelId}>Country for billing phone</span>
          <PhoneInputExample
            {...args}
            countryTriggerProps={{ "aria-labelledby": billingCountryLabelId }}
            label="Billing phone"
          />
        </VariantGroup>
      </VariantContainer>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    const defaultTrigger = canvas.getByRole("combobox", {
      name: "Slovakia (+421)",
    })

    await expect(defaultTrigger).not.toHaveAttribute("aria-labelledby")
    await expect(
      canvas.getByRole("combobox", { name: "Česko (+420)" })
    ).toBeVisible()
    await expect(
      canvas.getByRole("combobox", { name: "Country for support phone" })
    ).toBeVisible()
    const externallyLabelledTrigger = canvas.getByRole("combobox", {
      name: "Country for billing phone",
    })
    await expect(externallyLabelledTrigger).not.toHaveAttribute("aria-label")

    await userEvent.click(defaultTrigger)
    await userEvent.click(await body.findByRole("option", { name: /Czechia/ }))
    await waitFor(() =>
      expect(
        canvas.getByRole("combobox", { name: "Czechia (+420)" })
      ).toBeVisible()
    )
  },
}

export const WithDefaultValue: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A prefilled international number is formatted for reading while retaining its canonical E.164 form value.",
      },
    },
  },
  args: {
    defaultValue: "+421900123456",
  },
  render: (args) => <PhoneInputExample {...args} />,
}

export const DisabledAndReadOnly: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare unavailable fields with read-only values that remain available for focus and copying.",
      },
    },
  },
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
  parameters: {
    docs: {
      description: {
        story:
          "Choose a flag, calling code or custom country display without changing the phone-entry behavior.",
      },
    },
  },
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
        <div className="w-full max-w-2xs">
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
        <div className="w-full max-w-2xs">
          <PhoneInput {...args}>
            <PhoneInput.Label>Compact country trigger</PhoneInput.Label>
            <PhoneInput.Control>
              <PhoneInput.CountrySelect>
                <PhoneInput.CountryControl>
                  <PhoneInput.CountryTrigger
                    aria-label="Select country"
                    className="max-w-fit"
                  >
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
  parameters: {
    docs: {
      description: {
        story:
          "A phone field without a country picker suits a workflow that only accepts one known country.",
      },
    },
  },
  render: (args) => (
    <div className="w-full max-w-2xs">
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
  parameters: {
    docs: {
      description: {
        story:
          "Application-owned state stays in sync with user changes and authoritative updates from the parent.",
      },
    },
  },
  render: (args) => {
    const [value, setValue] = useState("")
    const [details, setDetails] = useState<PhoneInputValueChangeDetails | null>(
      null
    )

    return (
      <div className="grid w-full max-w-sm gap-200">
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
  play: async ({ canvasElement }) => {
    trackPhoneValueChange.mockClear()
    const canvas = within(canvasElement)
    const input = canvas.getByRole("textbox", {
      name: "Controlled phone",
    }) as HTMLInputElement
    await userEvent.type(input, "900123456")
    await waitFor(() => expect(input).toHaveValue("900 123 456"))
    await expect(trackPhoneValueChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        country: "SK",
        e164: "+421900123456",
        isValid: true,
      })
    )
    input.setSelectionRange(4, 5)
    await userEvent.keyboard("{Backspace}8")
    await waitFor(() => expect(input).toHaveValue("900 823 456"))
    await expect(trackPhoneValueChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ e164: "+421900823456" })
    )
  },
}

export const AsyncControlledValue: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A parent can load an international number after mount and synchronize both its country and displayed number.",
      },
    },
  },
  render: (args) => {
    const [value, setValue] = useState("")

    return (
      <div className="grid w-full max-w-sm gap-200">
        <PhoneInputExample
          {...args}
          helpText={
            value
              ? "Profile phone value is loaded into the controlled input."
              : "Load a saved profile phone into the controlled input."
          }
          label="Profile phone"
          name="profilePhone"
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
  play: async ({ canvasElement }) => {
    trackPhoneValueChange.mockClear()
    const canvas = within(canvasElement)
    await userEvent.click(
      canvas.getByRole("button", { name: "Load profile phone" })
    )
    await waitFor(() =>
      expect(
        canvas.getByRole("textbox", { name: "Profile phone" })
      ).toHaveValue("777 123 456")
    )
    await expect(
      canvas.getByRole("combobox", { name: "Czechia (+420)" })
    ).toBeVisible()
    await expect(
      canvasElement.querySelector('input[name="profilePhone"]')
    ).toHaveValue("+420777123456")
    await expect(trackPhoneValueChange).not.toHaveBeenCalled()
  },
}

export const PasteInternationalNumber: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "An international number updates its country prefix instead of duplicating that prefix in the national-number field.",
      },
    },
  },
  render: (args) => {
    const [value, setValue] = useState("")

    return (
      <div className="grid w-full max-w-sm gap-200">
        <PhoneInputExample
          {...args}
          defaultCountry="SK"
          helpText="Paste an international number; its country prefix syncs automatically."
          label="International paste"
          name="internationalPhone"
          value={value}
          onValueChange={(nextDetails) => {
            args.onValueChange?.(nextDetails)
            setValue(nextDetails.value)
          }}
        />
        <Button onClick={() => setValue("+420777123456")} type="button">
          Load Czech number
        </Button>
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    trackPhoneValueChange.mockClear()
    const canvas = within(canvasElement)
    const input = canvas.getByRole("textbox", { name: "International paste" })
    await userEvent.click(input)
    await userEvent.paste("+420777123456")
    await waitFor(() => expect(input).toHaveValue("777 123 456"))
    await expect(
      canvas.getByRole("combobox", { name: "Czechia (+420)" })
    ).toBeVisible()
    await expect(
      canvasElement.querySelector('input[name="internationalPhone"]')
    ).toHaveValue("+420777123456")
    await expect(trackPhoneValueChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        country: "CZ",
        callingCode: "420",
        nationalNumber: "777123456",
        e164: "+420777123456",
        isValid: true,
      })
    )
  },
}

export const LimitedCountries: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Limit destinations to supported countries while visibly distinguishing unavailable choices.",
      },
    },
  },
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
  parameters: {
    docs: {
      description: {
        story:
          "Customize the country list content while retaining selection semantics and keyboard navigation.",
      },
    },
  },
  render: (args) => (
    <div className="w-full max-w-sm">
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
  parameters: {
    docs: {
      description: {
        story:
          "Submit locally to inspect the E.164 hidden value and native phone validation without leaving the demo.",
      },
    },
  },
  render: (args) => {
    const [submittedValue, setSubmittedValue] = useState("None")

    return (
      <form
        className="grid w-full max-w-sm gap-200"
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
          nativeValidation={args.nativeValidation ?? true}
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
  play: async ({ canvasElement }) => {
    trackNativeFormSubmit.mockClear()
    const canvas = within(canvasElement)
    const input = canvas.getByRole("textbox", {
      name: /Native form phone/,
    }) as HTMLInputElement
    const submit = canvas.getByRole("button", { name: "Submit" })
    await userEvent.click(submit)
    await expect(trackNativeFormSubmit).not.toHaveBeenCalled()
    await expect(input.validity.valueMissing).toBe(true)
    await userEvent.type(input, "12")
    await waitFor(() => expect(input.validity.customError).toBe(true))
    await userEvent.click(submit)
    await expect(trackNativeFormSubmit).not.toHaveBeenCalled()
    await userEvent.clear(input)
    await userEvent.type(input, "900123456")
    await waitFor(() => expect(input.validity.valid).toBe(true))
    await expect(new FormData(input.form as HTMLFormElement).get("phone")).toBe(
      "+421900123456"
    )
    await userEvent.click(submit)
    await expect(trackNativeFormSubmit).toHaveBeenCalledTimes(1)
    await expect(trackNativeFormSubmit).toHaveBeenLastCalledWith(
      "+421900123456"
    )
    input.form?.reset()
    await waitFor(() => expect(input).toHaveValue(""))
    await expect(new FormData(input.form as HTMLFormElement).get("phone")).toBe(
      ""
    )
    await expect(input.validity.customError).toBe(false)
  },
}

export const NativeDraftSubmission: Story = {
  ...NativeFormValue,
  args: { nativeValidation: false },
  parameters: {
    docs: {
      description: {
        story:
          "Custom/server validation can submit an invalid draft unchanged when native phone validation is disabled.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    trackNativeFormSubmit.mockClear()
    const canvas = within(canvasElement)
    const input = canvas.getByRole("textbox", {
      name: /Native form phone/,
    }) as HTMLInputElement
    await userEvent.type(input, "12")
    await expect(input.validity.customError).toBe(false)
    await expect(new FormData(input.form as HTMLFormElement).get("phone")).toBe(
      "12"
    )
    await userEvent.click(canvas.getByRole("button", { name: "Submit" }))
    await expect(trackNativeFormSubmit).toHaveBeenCalledTimes(1)
    await expect(trackNativeFormSubmit).toHaveBeenLastCalledWith("12")
  },
}

export const ExternalFormReset: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "An externally associated form resets the default number and country together; canceled resets preserve edits.",
      },
    },
  },
  render(args) {
    const id = useId()
    const [owner, setOwner] = useState("first")
    const formId = `${id}-${owner}`
    const [cancelReset, setCancelReset] = useState(false)
    return (
      <div className="grid w-full max-w-sm gap-200">
        <form id={`${id}-first`} onReset={event => { if (cancelReset) event.preventDefault() }} />
        <form
          id={`${id}-second`}
          onReset={(event) => {
            if (cancelReset) event.preventDefault()
          }}
        />
        <PhoneInputExample
          {...args}
          form={formId}
          name="phone"
          defaultCountry="SK"
          defaultValue="+421900123456"
          label="External form phone"
        />
        <Button form={formId} type="reset">
          Reset phone
        </Button>
        <Button onClick={() => setOwner(owner === "first" ? "second" : "first")}>Reassociate phone</Button>
        <Button theme="outlined" onClick={() => setCancelReset(!cancelReset)}>
          Cancel reset: {cancelReset ? "on" : "off"}
        </Button>
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("textbox", {
      name: "External form phone",
    }) as HTMLInputElement
    await userEvent.clear(input)
    await userEvent.paste("+420777123456")
    await expect(
      canvas.getByRole("combobox", { name: "Czechia (+420)" })
    ).toBeVisible()
    await userEvent.click(
      canvas.getByRole("button", { name: "Cancel reset: off" })
    )
    await userEvent.click(canvas.getByRole("button", { name: "Reset phone" }))
    await expect(input).toHaveValue("777 123 456")
    await userEvent.click(
      canvas.getByRole("button", { name: "Cancel reset: on" })
    )
    const oldOwner = input.form!
    oldOwner.addEventListener("reset", event => event.preventDefault(), { once: true })
    await userEvent.click(canvas.getByRole("button", { name: "Reset phone" }))
    await new Promise(resolve => setTimeout(resolve, 30))
    await expect(input).toHaveValue("777 123 456")
    await userEvent.click(canvas.getByRole("button", { name: "Reassociate phone" }))
    oldOwner.reset()
    await new Promise(resolve => setTimeout(resolve, 30))
    await expect(input).toHaveValue("777 123 456")
    await userEvent.click(canvas.getByRole("button", { name: "Reset phone" }))
    await waitFor(() => expect(input).toHaveValue("900 123 456"))
    await expect(
      canvas.getByRole("combobox", { name: "Slovakia (+421)" })
    ).toBeVisible()
    await expect(new FormData(input.form as HTMLFormElement).get("phone")).toBe(
      "+421900123456"
    )
    await userEvent.clear(input)
    await userEvent.type(input, "901123456")
    const dispatchingOwner = input.form!
    dispatchingOwner.addEventListener("reset", () => {
      for (const control of Array.from(dispatchingOwner.elements)) {
        if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement) {
          control.setAttribute("form", oldOwner.id)
        }
      }
    }, { once: true })
    await userEvent.click(canvas.getByRole("button", { name: "Reset phone" }))
    await new Promise(resolve => setTimeout(resolve, 30))
    await expect(input).toHaveValue("901 123 456")
    await expect(new FormData(oldOwner).get("phone")).toBe("+421901123456")
  },
}

export const RefLifecycle: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Consumer refs retain React 19 cleanup on replacement/unmount without detaching on ordinary rerenders.",
      },
    },
  },
  render(args) {
    const [version, setVersion] = useState(0)
    const [shown, setShown] = useState(true)
    const [revision, setRevision] = useState(0)
    const objectRef = useRef<HTMLInputElement>(null)
    const refs = useMemo(
      () => [
        (node: HTMLInputElement | null) => {
          trackPhoneRef(node ? "A:attach" : "A:null")
          return () => trackPhoneRef("A:cleanup")
        },
        (node: HTMLInputElement | null) => {
          trackPhoneRef(node ? "B:attach" : "B:null")
          return () => trackPhoneRef("B:cleanup")
        },
        (node: HTMLInputElement | null) => {
          trackPhoneRef(node ? "legacy:attach" : "legacy:null")
        },
      ],
      []
    )
    return (
      <div className="grid w-full max-w-sm gap-200">
        {shown && (
          <PhoneInput {...args} data-revision={revision}>
            <PhoneInput.Label>Ref phone</PhoneInput.Label>
            <PhoneInput.Control>
              <PhoneInput.Input
                ref={version === 3 ? objectRef : refs[version]}
              />
            </PhoneInput.Control>
          </PhoneInput>
        )}
        <Button onClick={() => setRevision(revision + 1)}>Rerender</Button>
        <Button onClick={() => setVersion(Math.min(version + 1, 3))}>
          Replace ref
        </Button>
        <Button onClick={() => setShown(false)}>Unmount input</Button>
        <Button onClick={() => setShown(true)}>Mount input</Button>
        <Button
          onClick={() =>
            trackPhoneRef(
              objectRef.current === null ? "object:cleared" : "object:attached"
            )
          }
        >
          Inspect object ref
        </Button>
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    trackPhoneRef.mockClear()
    await userEvent.click(canvas.getByRole("button", { name: "Rerender" }))
    await expect(trackPhoneRef).not.toHaveBeenCalled()
    await userEvent.click(canvas.getByRole("button", { name: "Replace ref" }))
    await expect(trackPhoneRef.mock.calls.map(([event]) => event)).toEqual([
      "A:cleanup",
      "B:attach",
    ])
    await userEvent.click(canvas.getByRole("button", { name: "Unmount input" }))
    await expect(trackPhoneRef).toHaveBeenLastCalledWith("B:cleanup")
    await userEvent.click(canvas.getByRole("button", { name: "Mount input" }))
    await expect(trackPhoneRef).toHaveBeenLastCalledWith("B:attach")
    await userEvent.click(canvas.getByRole("button", { name: "Replace ref" }))
    await expect(trackPhoneRef).toHaveBeenCalledWith("B:cleanup")
    await userEvent.click(canvas.getByRole("button", { name: "Replace ref" }))
    await expect(trackPhoneRef).toHaveBeenCalledWith("legacy:null")
    await userEvent.click(
      canvas.getByRole("button", { name: "Inspect object ref" })
    )
    await expect(trackPhoneRef).toHaveBeenLastCalledWith("object:attached")
    await userEvent.click(canvas.getByRole("button", { name: "Unmount input" }))
    await userEvent.click(
      canvas.getByRole("button", { name: "Inspect object ref" })
    )
    await expect(trackPhoneRef).toHaveBeenLastCalledWith("object:cleared")
  },
}

const editingCountries: PhoneInputCountry[] = [
  { value: "SK", label: "Slovakia" },
  { value: "CZ", label: "Czechia" },
  { value: "DE", label: "Germany" },
  { value: "GB", label: "United Kingdom" },
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
]
const editingNumbers = [
  ["SK", "900123456", "+421900823456"],
  ["CZ", "777123456", "+420777823456"],
  ["DE", "15123456789", "+4915183456789"],
  ["GB", "7700900123", "+447708900123"],
  ["US", "2025550123", "+12028550123"],
  ["CA", "4165550123", "+14168550123"],
] as const

function EditingPhone({
  country,
  number,
  controlled,
}: {
  country: NonNullable<ComponentProps<typeof PhoneInput>["country"]>
  number: string
  controlled: boolean
}) {
  const [value, setValue] = useState(number)
  const name = `${country} ${controlled ? "controlled" : "uncontrolled"}`
  return (
    <form onSubmit={(event) => event.preventDefault()}>
      <PhoneInputExample
        countries={editingCountries}
        defaultCountry={country}
        defaultValue={number}
        name="phone"
        label={name}
        value={controlled ? value : undefined}
        onValueChange={(details) => setValue(details.value)}
        helpText="Edit a middle digit without changing the rest of the number."
      />
    </form>
  )
}

export const EditingPositions: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Controlled and uncontrolled formatting preserves middle edits across European and North American number patterns.",
      },
    },
  },
  render: () => (
    <div className="grid w-full max-w-md gap-300">
      {editingNumbers.flatMap(([country, number]) =>
        [false, true].map((controlled) => (
          <EditingPhone
            key={`${country}-${controlled}`}
            country={country}
            number={number}
            controlled={controlled}
          />
        ))
      )}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    for (const [country, , expected] of editingNumbers) {
      for (const controlled of [false, true]) {
        const input = canvas.getByRole("textbox", {
          name: `${country} ${controlled ? "controlled" : "uncontrolled"}`,
        }) as HTMLInputElement
        await userEvent.click(input)
        const digits = [...input.value.matchAll(/\d/g)]
        const offset = digits[3]?.index ?? 0
        input.setSelectionRange(offset, offset + 1)
        await userEvent.keyboard("{Backspace}8")
        await waitFor(() =>
          expect(new FormData(input.form as HTMLFormElement).get("phone")).toBe(
            expected
          )
        )
        await expect(input.selectionStart).toBeLessThan(input.value.length)
      }
    }
  },
}

function ResetOwnershipPhone({
  controlValue,
  controlCountry,
}: {
  controlValue: boolean
  controlCountry: boolean
}) {
  const [value, setValue] = useState("900123456")
  const [country, setCountry] = useState<"SK" | "CZ">("SK")
  const label = `Reset ${controlValue ? "controlled" : "default"} value / ${controlCountry ? "controlled" : "default"} country`
  return (
    <form className="grid gap-100" onSubmit={(event) => event.preventDefault()}>
      <PhoneInputExample
        label={label}
        countries={countries}
        defaultCountry="SK"
        defaultValue="900123456"
        name="phone"
        country={controlCountry ? country : undefined}
        value={controlValue ? value : undefined}
        onValueChange={(details) => setValue(details.value)}
        onCountryChange={(details) => {
          if (details.country === "SK" || details.country === "CZ")
            setCountry(details.country)
        }}
      />
      <Button type="reset">Reset {label}</Button>
    </form>
  )
}

export const ResetOwnership: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Native reset restores only uncontrolled defaults and leaves independently controlled values and countries with the parent.",
      },
    },
  },
  render: () => (
    <div className="grid w-full max-w-md gap-300">
      {[false, true].flatMap((controlValue) =>
        [false, true].map((controlCountry) => (
          <ResetOwnershipPhone
            key={`${controlValue}-${controlCountry}`}
            controlValue={controlValue}
            controlCountry={controlCountry}
          />
        ))
      )}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    for (const controlValue of [false, true]) {
      for (const controlCountry of [false, true]) {
        const label = `Reset ${controlValue ? "controlled" : "default"} value / ${controlCountry ? "controlled" : "default"} country`
        const input = canvas.getByRole("textbox", {
          name: label,
        }) as HTMLInputElement
        await userEvent.clear(input)
        await userEvent.paste("+420777123456")
        input.form?.reset()
        const formCanvas = within(input.form as HTMLFormElement)
        await waitFor(() =>
          expect(
            formCanvas.getByRole("combobox", {
              name: controlCountry ? "Czechia (+420)" : "Slovakia (+421)",
            })
          ).toBeVisible()
        )
        const expectedValue = controlValue
          ? controlCountry
            ? "777 123 456"
            : "777123456"
          : "900 123 456"
        await waitFor(() => expect(input).toHaveValue(expectedValue))
      }
    }
  },
}
