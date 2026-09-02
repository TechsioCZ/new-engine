// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-22805
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/molecules/form-textarea.tsx
// component=FormTextarea

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
})
const disabled = figma.selectedInstance.getEnum("state", {
  default: false,
  error: false,
  success: false,
  warning: false,
  disabled: true,
})
const required = figma.selectedInstance.getBoolean("required")

export default {
  id: "FormTextarea",
  imports: [
    'import { FormTextarea } from "@techsio/ui-kit/molecules/form-textarea"',
  ],
  example: figma.tsx`<FormTextarea${figma.helpers.react.renderProp(
    "disabled",
    disabled,
  )} id="field" label="Label"${figma.helpers.react.renderProp(
    "required",
    required,
  )}${figma.helpers.react.renderProp(
    "size",
    size,
  )}${figma.helpers.react.renderProp("validateStatus", validateStatus)}/>`,
  metadata: { nestable: true },
}
