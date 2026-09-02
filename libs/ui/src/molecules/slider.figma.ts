// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-31876
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/molecules/slider.tsx
// component=Slider

import figma from "figma"

const size = figma.selectedInstance.getEnum("size", {
  sm: "sm",
  md: "md",
  lg: "lg",
})
const disabled = figma.selectedInstance.getEnum("state", {
  default: false,
  disabled: true,
  invalid: false,
})
const validateStatus = figma.selectedInstance.getEnum("state", {
  default: "default",
  disabled: "default",
  invalid: "error",
})

export default {
  id: "Slider",
  imports: ['import { Slider } from "@techsio/ui-kit/molecules/slider"'],
  example: figma.tsx`<Slider defaultValue={[50]}${figma.helpers.react.renderProp(
    "disabled",
    disabled
  )} max={100} min={0}${figma.helpers.react.renderProp(
    "size",
    size
  )}${figma.helpers.react.renderProp("validateStatus", validateStatus)}/>`,
  metadata: { nestable: true },
}
