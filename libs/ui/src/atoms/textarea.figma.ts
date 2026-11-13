// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-19406
// source=https://github.com/TechsioCZ/new-engine/blob/master/libs/ui/src/atoms/textarea.tsx
// component=Textarea

import figma from "figma"

const size = figma.selectedInstance.getEnum("size", {
  sm: "sm",
  md: "md",
  lg: "lg",
})
// Figma still names the property variant; code splits it into validateStatus + appearance.
const validateStatus = figma.selectedInstance.getEnum("variant", {
  error: "error",
  success: "success",
  warning: "warning",
})
const appearance = figma.selectedInstance.getEnum("variant", {
  borderless: "plain",
})
const disabled = figma.selectedInstance.getEnum("state", {
  default: false,
  disabled: true,
  readonly: false,
})
const readonly = figma.selectedInstance.getEnum("state", {
  default: false,
  disabled: false,
  readonly: true,
})

export default {
  id: "Textarea",
  imports: ['import { Textarea } from "@techsio/ui-kit/atoms/textarea"'],
  example: figma.code`<Textarea${figma.helpers.react.renderProp(
    "disabled",
    disabled
  )}${figma.helpers.react.renderProp(
    "readonly",
    readonly
  )}${figma.helpers.react.renderProp(
    "size",
    size
  )}${figma.helpers.react.renderProp(
    "appearance",
    appearance
  )}${figma.helpers.react.renderProp("validateStatus", validateStatus)}/>`,
  metadata: { nestable: true },
}
