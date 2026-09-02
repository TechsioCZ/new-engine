// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-19620
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/atoms/tooltip.tsx
// component=Tooltip

import figma from "figma"

const size = figma.selectedInstance.getEnum("size", {
  sm: "sm",
  md: "md",
  lg: "lg",
})
const variant = figma.selectedInstance.getEnum("variant", {
  default: "default",
  outline: "outline",
})
const placement = figma.selectedInstance.getEnum("placement", {
  top: "top",
  "top-start": "top-start",
  "top-end": "top-end",
  right: "right",
  bottom: "bottom",
  "bottom-start": "bottom-start",
  "bottom-end": "bottom-end",
  left: "left",
})

export default {
  id: "Tooltip",
  imports: [
    'import { Tooltip } from "@techsio/ui-kit/atoms/tooltip"',
    'import { Button } from "@techsio/ui-kit/atoms/button"',
  ],
  example: figma.tsx`<Tooltip content="Tooltip content" open={true}${figma.helpers.react.renderProp(
    "placement",
    placement
  )}${figma.helpers.react.renderProp(
    "size",
    size
  )}${figma.helpers.react.renderProp("variant", variant)}>
        <Button size="sm" variant="secondary">
          Hover me
        </Button>
      </Tooltip>`,
  metadata: { nestable: true },
}
