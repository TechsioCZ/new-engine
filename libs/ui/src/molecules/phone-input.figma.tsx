import figma from "@figma/code-connect"

import { PhoneInput } from "./phone-input"

figma.connect(
  PhoneInput,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=2541-171",
  {
    example: ({ size, validateStatus, disabled, readOnly, required }) => (
      <PhoneInput
        defaultCountry="SK"
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        size={size}
        validateStatus={validateStatus}
      >
        <PhoneInput.Label>Phone number</PhoneInput.Label>
        <PhoneInput.Control>
          <PhoneInput.CountryPicker />
          <PhoneInput.Input />
        </PhoneInput.Control>
        <PhoneInput.StatusText>Helper text</PhoneInput.StatusText>
      </PhoneInput>
    ),
    imports: [
      'import { PhoneInput } from "@techsio/ui-kit/molecules/phone-input"',
    ],
    props: {
      disabled: figma.enum("state", {
        default: false,
        disabled: true,
        error: false,
        readonly: false,
        success: false,
        warning: false,
      }),
      readOnly: figma.enum("state", {
        default: false,
        disabled: false,
        error: false,
        readonly: true,
        success: false,
        warning: false,
      }),
      required: figma.boolean("required"),
      size: figma.enum("size", {
        lg: "lg",
        md: "md",
        sm: "sm",
      }),
      validateStatus: figma.enum("state", {
        default: "default",
        disabled: "default",
        error: "error",
        readonly: "default",
        success: "success",
        warning: "warning",
      }),
    },
  },
)
