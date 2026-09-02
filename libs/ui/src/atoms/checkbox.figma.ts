// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-8692
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/atoms/checkbox.tsx
// component=Checkbox

import figma from "figma"

const checked = figma.selectedInstance.getEnum("state", {
  unchecked: false,
  checked: true,
  indeterminate: false,
  error: false,
})
const indeterminate = figma.selectedInstance.getEnum("state", {
  unchecked: false,
  checked: false,
  indeterminate: true,
  error: false,
})
const disabled = figma.selectedInstance.getBoolean("disabled")
const invalid = figma.selectedInstance.getEnum("state", {
  unchecked: false,
  checked: false,
  indeterminate: false,
  error: true,
})

export default {
  id: "Checkbox",
  imports: ['import { Checkbox } from "@techsio/ui-kit/atoms/checkbox"'],
  example: figma.tsx`<Checkbox${figma.helpers.react.renderProp(
    "checked",
    checked,
  )}${figma.helpers.react.renderProp(
    "disabled",
    disabled,
  )}${figma.helpers.react.renderProp(
    "indeterminate",
    indeterminate,
  )}${figma.helpers.react.renderProp("invalid", invalid)}/>`,
  metadata: { nestable: true },
}
