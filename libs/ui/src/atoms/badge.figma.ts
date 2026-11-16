// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-104
// source=https://github.com/TechsioCZ/new-engine/blob/master/libs/ui/src/atoms/badge.tsx
// component=Badge

import figma from "figma"

// Figma still names the property variant; code splits it into severity + appearance.
const severity = figma.selectedInstance.getEnum("variant", {
  primary: "primary",
  secondary: "secondary",
  tertiary: "tertiary",
  discount: "discount",
  info: "info",
  success: "success",
  warning: "warning",
  danger: "danger",
  outline: "neutral",
})
const appearance = figma.selectedInstance.getEnum("variant", {
  outline: "outline",
})
const size = figma.selectedInstance.getEnum("size", {
  sm: "sm",
  md: "md",
  lg: "lg",
  xl: "xl",
})
// Badge exposes no `children` text property — the label is a plain text layer
const childrenLayer = figma.selectedInstance.findText("Label")
const children =
  childrenLayer.type === "ERROR" ? undefined : childrenLayer.textContent

export default {
  id: "Badge",
  imports: ['import { Badge } from "@techsio/ui-kit/atoms/badge"'],
  example: figma.code`<Badge${figma.helpers.react.renderProp(
    "appearance",
    appearance
  )}${figma.helpers.react.renderProp(
    "size",
    size
  )}${figma.helpers.react.renderProp("severity", severity)}>
        ${figma.helpers.react.renderChildren(children)}
      </Badge>`,
  metadata: { nestable: true },
}
