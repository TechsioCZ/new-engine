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
// the message layer is named per status variant ("Error message", "Success
// message", …), so match whichever text layer the selected variant carries
const childrenLayer = figma.selectedInstance.findLayers(
  (node) => node.type === "TEXT"
)[0]
const children = childrenLayer ? childrenLayer.textContent : undefined

export default {
  id: "StatusText",
  imports: ['import { StatusText } from "@techsio/ui-kit/atoms/status-text"'],
  example: figma.tsx`<StatusText${figma.helpers.react.renderProp(
    "size",
    size
  )}${figma.helpers.react.renderProp("status", status)}>
        ${figma.helpers.react.renderChildren(children)}
      </StatusText>`,
  metadata: { nestable: true },
}
