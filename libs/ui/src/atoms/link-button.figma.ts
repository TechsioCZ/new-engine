// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-37412
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/atoms/link-button.tsx
// component=LinkButton

import figma from "figma"

const variant = figma.selectedInstance.getEnum("variant", {
  primary: "primary",
  secondary: "secondary",
  tertiary: "tertiary",
  warning: "warning",
  danger: "danger",
})
const theme = figma.selectedInstance.getEnum("theme", {
  solid: "solid",
  light: "light",
  outlined: "outlined",
  borderless: "borderless",
})
const size = figma.selectedInstance.getEnum("size", {
  sm: "sm",
  md: "md",
  lg: "lg",
})
const children = figma.selectedInstance.getString("children")
const disabled = figma.selectedInstance.getEnum("state", {
  default: false,
  hover: false,
  disabled: true,
})

export default {
  id: "LinkButton",
  imports: ['import { LinkButton } from "@techsio/ui-kit/atoms/link-button"'],
  example: figma.tsx`<LinkButton${figma.helpers.react.renderProp(
    "disabled",
    disabled,
  )} href="#"${figma.helpers.react.renderProp(
    "size",
    size,
  )}${figma.helpers.react.renderProp(
    "theme",
    theme,
  )}${figma.helpers.react.renderProp("variant", variant)}>
        ${figma.helpers.react.renderChildren(children)}
      </LinkButton>`,
  metadata: { nestable: true },
}
