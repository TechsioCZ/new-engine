// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-19238
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/atoms/status-text.tsx
// component=StatusText

import figma from "figma"

const size = figma.selectedInstance.getEnum("size", {
  sm: "sm",
  md: "md",
  lg: "lg",
})
const status = figma.selectedInstance.getEnum("status", {
  default: "default",
  error: "error",
  success: "success",
  warning: "warning",
})
const children = figma.selectedInstance.getString("children")

export default {
  id: "StatusText",
  imports: ['import { StatusText } from "@libs/ui/atoms/status-text"'],
  example: figma.tsx`<StatusText${figma.helpers.react.renderProp(
    "size",
    size,
  )}${figma.helpers.react.renderProp("status", status)}>
        ${figma.helpers.react.renderChildren(children)}
      </StatusText>`,
  metadata: { nestable: true },
}
