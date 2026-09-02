// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-23394
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/molecules/phone-input.tsx
// component=PhoneInput

import figma from "figma"

const size = figma.selectedInstance.getEnum("size", {
  sm: "sm",
  md: "md",
  lg: "lg",
})
const validateStatus = figma.selectedInstance.getEnum("state", {
  default: "default",
  error: "error",
  success: "success",
  warning: "warning",
  disabled: "default",
  readonly: "default",
})
const disabled = figma.selectedInstance.getEnum("state", {
  default: false,
  error: false,
  success: false,
  warning: false,
  disabled: true,
  readonly: false,
})
const readOnly = figma.selectedInstance.getEnum("state", {
  default: false,
  error: false,
  success: false,
  warning: false,
  disabled: false,
  readonly: true,
})
const required = figma.selectedInstance.getBoolean("required")

export default {
  id: "PhoneInput",
  imports: [
    'import { PhoneInput } from "@techsio/ui-kit/molecules/phone-input"',
  ],
  example: figma.code`<PhoneInput defaultCountry="SK"${figma.helpers.react.renderProp(
    "disabled",
    disabled,
  )}${figma.helpers.react.renderProp(
    "readOnly",
    readOnly,
  )}${figma.helpers.react.renderProp(
    "required",
    required,
  )}${figma.helpers.react.renderProp(
    "size",
    size,
  )}${figma.helpers.react.renderProp("validateStatus", validateStatus)}>
        <PhoneInput.Label>Phone number</PhoneInput.Label>
        <PhoneInput.Control>
          <PhoneInput.CountryPicker />
          <PhoneInput.Input />
        </PhoneInput.Control>
        <PhoneInput.StatusText>Helper text</PhoneInput.StatusText>
      </PhoneInput>`,
  metadata: { nestable: true },
}
