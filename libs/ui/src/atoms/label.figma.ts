// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-14837
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/atoms/label.tsx
// component=Label

import figma from "figma"

const size = figma.selectedInstance.getEnum("size", {
  sm: "sm",
  md: "md",
  lg: "lg",
  current: "current",
})
const disabled = figma.selectedInstance.getBoolean("disabled")
const required = figma.selectedInstance.getBoolean("required")
const children = figma.selectedInstance.getString("children")

export default {
  id: "Label",
  imports: ['import { Label } from "@techsio/ui-kit/atoms/label"'],
  example: figma.tsx`<Label${figma.helpers.react.renderProp(
    "disabled",
    disabled,
  )}${figma.helpers.react.renderProp(
    "required",
    required,
  )}${figma.helpers.react.renderProp("size", size)}>
        ${figma.helpers.react.renderChildren(children)}
      </Label>`,
  metadata: { nestable: true },
}
