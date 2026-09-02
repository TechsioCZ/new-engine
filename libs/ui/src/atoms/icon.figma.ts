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

// `icon` takes an IconType token string, not JSX. The swapped glyph instance is
// named "Token Icon/token-icon-plus", so the token is the last path segment.
const iconSwap = figma.selectedInstance.getInstanceSwap("icon")
const iconName =
  iconSwap && typeof iconSwap.name === "string" ? iconSwap.name : ""
const icon = iconName ? iconName.split("/").pop() : "token-icon-plus"

export default {
  id: "Icon",
  imports: ['import { Icon } from "@techsio/ui-kit/atoms/icon"'],
  example: figma.tsx`<Icon${figma.helpers.react.renderProp(
    "color",
    color
  )} icon="${icon}"${figma.helpers.react.renderProp("size", size)} />`,
  // expose the token so parents (Button, ActionIcon) can render `icon="…"`
  // instead of embedding this component's JSX into a string prop
  metadata: { nestable: true, props: { icon } },
}
