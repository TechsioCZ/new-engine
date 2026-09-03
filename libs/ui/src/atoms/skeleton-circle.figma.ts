// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-16695
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/atoms/skeleton.tsx
// component=Skeleton.Circle

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
const size = figma.selectedInstance.getEnum("size", {
  sm: "sm",
  md: "md",
  lg: "lg",
  xl: "xl",
})

export default {
  id: "Skeleton.Circle",
  imports: ['import { Skeleton } from "@techsio/ui-kit/atoms/skeleton"'],
  example: figma.code`<Skeleton.Circle${figma.helpers.react.renderProp(
    "size",
    size
  )}${figma.helpers.react.renderProp(
    "speed",
    speed
  )}${figma.helpers.react.renderProp("variant", variant)}>
          <div className="size-16 rounded-full ${placeholderBgClass}"/>
        </Skeleton.Circle>`,
  metadata: { nestable: false },
}
