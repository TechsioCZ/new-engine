// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-104
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/atoms/badge.tsx
// component=Badge

import figma from "figma"

const variant = figma.selectedInstance.getEnum("variant", {
  primary: "primary",
  secondary: "secondary",
  tertiary: "tertiary",
  discount: "discount",
  info: "info",
  success: "success",
  warning: "warning",
  danger: "danger",
  outline: "outline",
})
const size = figma.selectedInstance.getEnum("size", {
  sm: "sm",
  md: "md",
  lg: "lg",
  xl: "xl",
})
const children = figma.selectedInstance.getString("children")

export default {
  id: "Badge",
  imports: ['import { Badge } from "@techsio/ui-kit/atoms/badge"'],
  example: figma.tsx`<Badge${figma.helpers.react.renderProp(
    "size",
    size,
  )}${figma.helpers.react.renderProp("variant", variant)}>
        ${figma.helpers.react.renderChildren(children)}
      </Badge>`,
  metadata: { nestable: true },
}
