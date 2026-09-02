// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-19406
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/atoms/textarea.tsx
// component=Textarea

import figma from "figma"

const size = figma.selectedInstance.getEnum("size", {
  sm: "sm",
  md: "md",
  lg: "lg",
})
const variant = figma.selectedInstance.getEnum("variant", {
  default: "default",
  error: "error",
  success: "success",
  warning: "warning",
  borderless: "borderless",
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
  example: figma.tsx`<Textarea${figma.helpers.react.renderProp(
    "disabled",
    disabled,
  )}${figma.helpers.react.renderProp(
    "readonly",
    readonly,
  )}${figma.helpers.react.renderProp(
    "size",
    size,
  )}${figma.helpers.react.renderProp("variant", variant)}/>`,
  metadata: { nestable: true },
}
