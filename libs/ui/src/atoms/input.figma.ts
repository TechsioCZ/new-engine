// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-13336
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/atoms/input.tsx
// component=Input

import figma from "figma"

const size = figma.selectedInstance.getEnum("size", {
  sm: "sm",
  md: "md",
  lg: "lg",
})
const variant = figma.selectedInstance.getEnum("state", {
  default: "default",
  error: "error",
  success: "success",
  warning: "warning",
  disabled: "default",
})
const disabled = figma.selectedInstance.getEnum("state", {
  default: false,
  error: false,
  success: false,
  warning: false,
  disabled: true,
})

export default {
  id: "Input",
  imports: ['import { Input } from "@techsio/ui-kit/atoms/input"'],
  example: figma.code`<Input${figma.helpers.react.renderProp(
    "disabled",
    disabled,
  )}${figma.helpers.react.renderProp(
    "size",
    size,
  )}${figma.helpers.react.renderProp("variant", variant)}/>`,
  metadata: { nestable: true },
}
