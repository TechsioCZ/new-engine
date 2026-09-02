// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-24189
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/molecules/select.tsx
// component=Select

import figma from "figma"

const size = figma.selectedInstance.getEnum("size", {
  xs: "xs",
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
  id: "Select",
  imports: ['import { Select } from "@techsio/ui-kit/molecules/select"'],
  example: figma.code`<Select${figma.helpers.react.renderProp(
    "disabled",
    disabled
  )} items={[]}${figma.helpers.react.renderProp(
    "readOnly",
    readOnly
  )}${figma.helpers.react.renderProp(
    "required",
    required
  )}${figma.helpers.react.renderProp(
    "size",
    size
  )}${figma.helpers.react.renderProp("validateStatus", validateStatus)}>
        <Select.Label>Label</Select.Label>
        <Select.Trigger />
      </Select>`,
  metadata: { nestable: true },
}
