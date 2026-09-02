// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-31659
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/molecules/switch.tsx
// component=Switch

import figma from "figma"

const checked = figma.selectedInstance.getEnum("state", {
  unchecked: false,
  checked: true,
  disabled: false,
})
const disabled = figma.selectedInstance.getEnum("state", {
  unchecked: false,
  checked: false,
  disabled: true,
})
const validateStatus = figma.selectedInstance.getEnum("validateStatus", {
  default: "default",
  error: "error",
  success: "success",
  warning: "warning",
})
const children = figma.selectedInstance.getString("label")

export default {
  id: "Switch",
  imports: ['import { Switch } from "@techsio/ui-kit/molecules/switch"'],
  example: figma.tsx`<Switch${figma.helpers.react.renderProp(
    "checked",
    checked,
  )}${figma.helpers.react.renderProp(
    "disabled",
    disabled,
  )}${figma.helpers.react.renderProp("validateStatus", validateStatus)}>
        ${figma.helpers.react.renderChildren(children)}
      </Switch>`,
  metadata: { nestable: true },
}
