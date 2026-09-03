// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-3555
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/atoms/button.tsx
// component=Button

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
const loadingText = figma.selectedInstance.getString("loadingText")
// Button.icon takes an IconType token string, so read the token the nested Icon
// template exposes as metadata rather than embedding its rendered JSX.
function iconToken(propName) {
  const swap = figma.selectedInstance.getInstanceSwap(propName)
  if (!swap || swap.type !== "INSTANCE") {
    return
  }
  const props = swap.executeTemplate().metadata?.props
  return props ? props.icon : undefined
}

const showLeftIcon = figma.selectedInstance.getBoolean("showLeftIcon")
const iconLeft = iconToken("iconLeft")
const showRightIcon = figma.selectedInstance.getBoolean("showRightIcon")
const iconRight = iconToken("iconRight")
const disabled = figma.selectedInstance.getEnum("state", {
  default: false,
  hover: false,
  active: false,
  focus: false,
  disabled: true,
  loading: false,
})
const isLoading = figma.selectedInstance.getEnum("state", {
  default: false,
  hover: false,
  active: false,
  focus: false,
  disabled: false,
  loading: true,
})

// both flags resolve at template time, so emit the branch that actually applies
function activeIcon() {
  if (showRightIcon) {
    return { icon: iconRight, iconPosition: "right" }
  }
  if (showLeftIcon) {
    return { icon: iconLeft, iconPosition: "left" }
  }
  return { icon: undefined, iconPosition: undefined }
}

const { icon, iconPosition } = activeIcon()

export default {
  id: "Button",
  imports: ['import { Button } from "@techsio/ui-kit/atoms/button"'],
  example: figma.code`<Button${figma.helpers.react.renderProp(
    "disabled",
    disabled
  )}${figma.helpers.react.renderProp(
    "icon",
    icon
  )}${figma.helpers.react.renderProp(
    "iconPosition",
    iconPosition
  )}${figma.helpers.react.renderProp(
    "isLoading",
    isLoading
  )}${figma.helpers.react.renderProp(
    "loadingText",
    loadingText
  )}${figma.helpers.react.renderProp(
    "size",
    size
  )}${figma.helpers.react.renderProp(
    "theme",
    theme
  )}${figma.helpers.react.renderProp("variant", variant)}>
        ${figma.helpers.react.renderChildren(children)}
      </Button>`,
  metadata: { nestable: false },
}
