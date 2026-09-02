// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-16670
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/atoms/skeleton.tsx
// component=Skeleton.Rectangle

import figma from "figma"

const variant = figma.selectedInstance.getEnum("variant", {
  primary: "primary",
  secondary: "secondary",
})
const placeholderBgClass = figma.selectedInstance.getEnum("variant", {
  primary: "bg-skeleton-bg-primary",
  secondary: "bg-skeleton-bg-secondary",
})
const speed = figma.selectedInstance.getEnum("speed", {
  slow: "slow",
  normal: "normal",
  fast: "fast",
})

export default {
  id: "Skeleton.Rectangle",
  imports: ['import { Skeleton } from "@techsio/ui-kit/atoms/skeleton"'],
  example: figma.code`<Skeleton.Rectangle${figma.helpers.react.renderProp(
    "speed",
    speed
  )}${figma.helpers.react.renderProp("variant", variant)}>
          <div className="h-20 w-xs rounded-md ${placeholderBgClass}"/>
        </Skeleton.Rectangle>`,
  metadata: { nestable: false },
}
