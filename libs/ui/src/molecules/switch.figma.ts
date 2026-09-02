// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-31659
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/molecules/switch.tsx
// component=Switch

import figma from "figma"

const checked = figma.selectedInstance.getEnum("state", {
  default: false,
  checked: true,
  disabled: false,
  "disabled-checked": true,
  invalid: false,
  focus: false,
})
const disabled = figma.selectedInstance.getEnum("state", {
  default: false,
  checked: false,
  disabled: true,
  "disabled-checked": true,
  invalid: false,
  focus: false,
})
const validateStatus = figma.selectedInstance.getEnum("state", {
  default: "default",
  checked: "default",
  disabled: "default",
  "disabled-checked": "default",
  invalid: "error",
  focus: "default",
})

export default {
  id: "Switch",
  imports: ['import { Switch } from "@techsio/ui-kit/molecules/switch"'],
  example: figma.tsx`<Switch${figma.helpers.react.renderProp(
    "checked",
    checked
  )}${figma.helpers.react.renderProp(
    "disabled",
    disabled
  )}${figma.helpers.react.renderProp("validateStatus", validateStatus)}>
        Label
      </Switch>`,
  metadata: { nestable: true },
}
