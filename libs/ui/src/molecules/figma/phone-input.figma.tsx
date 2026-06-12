import figma from "@figma/code-connect"
import { PhoneInput } from "../phone-input"

figma.connect(
  PhoneInput,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=2541-171",
  {
    imports: [
      'import { PhoneInput } from "@techsio/ui-kit/molecules/phone-input"',
    ],
    props: {
      size: figma.enum("size", {
        sm: "sm",
        md: "md",
        lg: "lg",
      }),
      validateStatus: figma.enum("state", {
        default: "default",
        error: "error",
        success: "success",
        warning: "warning",
      }),
      required: figma.boolean("required"),
    },
    example: ({ size, validateStatus, required }) => (
      <PhoneInput
        defaultCountry="SK"
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
  }
)
