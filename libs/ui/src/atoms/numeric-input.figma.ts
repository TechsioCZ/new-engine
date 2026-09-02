// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-14143
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/atoms/numeric-input.tsx
// component=NumericInput

import figma from "figma"

const size = figma.selectedInstance.getEnum("size", {
  sm: "sm",
  md: "md",
  lg: "lg",
})
const invalid = figma.selectedInstance.getEnum("state", {
  default: false,
  error: true,
  disabled: false,
  readonly: false,
})
const disabled = figma.selectedInstance.getEnum("state", {
  default: false,
  error: false,
  disabled: true,
  readonly: false,
})
const readOnly = figma.selectedInstance.getEnum("state", {
  default: false,
  error: false,
  disabled: false,
  readonly: true,
})

export default {
  id: "NumericInput",
  imports: [
    'import { NumericInput } from "@techsio/ui-kit/atoms/numeric-input"',
  ],
  example: figma.tsx`<NumericInput defaultValue={42}${figma.helpers.react.renderProp(
    "disabled",
    disabled,
  )} id="quantity"${figma.helpers.react.renderProp(
    "invalid",
    invalid,
  )}${figma.helpers.react.renderProp(
    "readOnly",
    readOnly,
  )}${figma.helpers.react.renderProp("size", size)}>
        <NumericInput.Control>
          <NumericInput.Input />
          <NumericInput.TriggerContainer>
            <NumericInput.IncrementTrigger />
            <NumericInput.DecrementTrigger />
          </NumericInput.TriggerContainer>
        </NumericInput.Control>
      </NumericInput>`,
  metadata: { nestable: true },
}
