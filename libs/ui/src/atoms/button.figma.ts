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
const showLeftIcon = figma.selectedInstance.getBoolean("showLeftIcon")
const iconLeft = figma.selectedInstance
  .getInstanceSwap("iconLeft")
  ?.executeTemplate().example
const showRightIcon = figma.selectedInstance.getBoolean("showRightIcon")
const iconRight = figma.selectedInstance
  .getInstanceSwap("iconRight")
  ?.executeTemplate().example
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

export default {
  id: "Button",
  imports: ['import { Button } from "@techsio/ui-kit/atoms/button"'],
  example: figma.tsx`function Example() {
    const sharedProps = {
        disabled: ${figma.helpers.react.renderPropValue(disabled)},
        isLoading: ${figma.helpers.react.renderPropValue(isLoading)},
        loadingText: ${figma.helpers.react.renderPropValue(loadingText)},
        size: ${figma.helpers.react.renderPropValue(size)},
        theme: ${figma.helpers.react.renderPropValue(theme)},
        variant: ${figma.helpers.react.renderPropValue(variant)},
    };
    if (${figma.helpers.react.renderPropValue(showRightIcon)}) {
        return (<Button {...sharedProps}${figma.helpers.react.renderProp(
          "icon",
          iconRight
        )} iconPosition="right">
            ${figma.helpers.react.renderChildren(children)}
          </Button>);
    }
    if (${figma.helpers.react.renderPropValue(showLeftIcon)}) {
        return (<Button {...sharedProps}${figma.helpers.react.renderProp(
          "icon",
          iconLeft
        )} iconPosition="left">
            ${figma.helpers.react.renderChildren(children)}
          </Button>);
    }
    return <Button {...sharedProps}>${figma.helpers.react.renderChildren(
      children
    )}</Button>;
}`,
  metadata: { nestable: false },
}
