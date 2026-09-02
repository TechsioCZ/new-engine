// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-20608
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/molecules/form-checkbox.tsx
// component=FormCheckbox

import figma from "figma"

const size = figma.selectedInstance.getEnum("size", {
  sm: "sm",
  md: "md",
  lg: "lg",
})
const checked = figma.selectedInstance.getEnum("state", {
  default: false,
  checked: true,
  indeterminate: false,
  disabled: false,
})
const indeterminate = figma.selectedInstance.getEnum("state", {
  default: false,
  checked: false,
  indeterminate: true,
  disabled: false,
})
const disabled = figma.selectedInstance.getEnum("state", {
  default: false,
  checked: false,
  indeterminate: false,
  disabled: true,
})
// no text component property — the label is a plain text layer
const childrenLayer = figma.selectedInstance.findText("Label")
const children =
  childrenLayer.type !== "ERROR" ? childrenLayer.textContent : undefined

export default {
  id: "FormCheckbox",
  imports: [
    'import { FormCheckbox } from "@techsio/ui-kit/molecules/form-checkbox"',
  ],
  example: figma.tsx`<FormCheckbox${figma.helpers.react.renderProp(
    "checked",
    checked
  )}${figma.helpers.react.renderProp(
    "disabled",
    disabled
  )}${figma.helpers.react.renderProp(
    "indeterminate",
    indeterminate
  )}${figma.helpers.react.renderProp("size", size)}>
        ${figma.helpers.react.renderChildren(children)}
      </FormCheckbox>`,
  metadata: { nestable: true },
}
