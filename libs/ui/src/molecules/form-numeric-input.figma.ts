// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-21378
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/molecules/form-numeric-input.tsx
// component=FormNumericInput

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
const required = figma.selectedInstance.getEnum("required", {
  true: true,
  false: false,
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

export default {
  id: "FormNumericInput",
  imports: [
    'import { NumericInput } from "@techsio/ui-kit/atoms/numeric-input"',
    'import { FormNumericInput } from "@techsio/ui-kit/molecules/form-numeric-input"',
  ],
  example: figma.code`<FormNumericInput defaultValue={42}${figma.helpers.react.renderProp(
    "disabled",
    disabled,
  )} helpText="Enter value between 0-100" id="quantity" label="Quantity"${figma.helpers.react.renderProp(
    "readOnly",
    readOnly,
  )}${figma.helpers.react.renderProp(
    "required",
    required,
  )}${figma.helpers.react.renderProp(
    "size",
    size,
  )}${figma.helpers.react.renderProp("validateStatus", validateStatus)}>
        <NumericInput.Control>
          <NumericInput.Input />
          <NumericInput.TriggerContainer>
            <NumericInput.IncrementTrigger />
            <NumericInput.DecrementTrigger />
          </NumericInput.TriggerContainer>
        </NumericInput.Control>
      </FormNumericInput>`,
  metadata: { nestable: true },
}
