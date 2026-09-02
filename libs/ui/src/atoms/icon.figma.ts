// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-9582
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/atoms/icon.tsx
// component=Icon

import figma from "figma"

const size = figma.selectedInstance.getEnum("size", {
  current: "current",
  xs: "xs",
  sm: "sm",
  md: "md",
  lg: "lg",
  xl: "xl",
  "2xl": "2xl",
})
const color = figma.selectedInstance.getEnum("color", {
  current: "current",
  primary: "primary",
  secondary: "secondary",
  danger: "danger",
  success: "success",
  warning: "warning",
})

export default {
  id: "Icon",
  imports: ['import { Icon } from "@techsio/ui-kit/atoms/icon"'],
  example: figma.tsx`<Icon${figma.helpers.react.renderProp(
    "color",
    color
  )} icon="token-icon-plus"${figma.helpers.react.renderProp("size", size)} />`,
  metadata: { nestable: true },
}
