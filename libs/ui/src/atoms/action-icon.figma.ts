// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-39583
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/atoms/action-icon.tsx
// component=ActionIcon

import figma from "figma"

const size = figma.selectedInstance.getEnum("size", {
  sm: "sm",
  md: "md",
  lg: "lg",
})
const tone = figma.selectedInstance.getEnum("tone", {
  neutral: "neutral",
  danger: "danger",
})

export default {
  id: "ActionIcon",
  imports: ['import { ActionIcon } from "@techsio/ui-kit/atoms/action-icon"'],
  example: figma.tsx`<ActionIcon aria-label="Clear" icon="token-icon-close"${figma.helpers.react.renderProp(
    "size",
    size,
  )}${figma.helpers.react.renderProp("tone", tone)}/>`,
  metadata: { nestable: true },
}
