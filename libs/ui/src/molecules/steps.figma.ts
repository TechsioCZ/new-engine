// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-33928
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/molecules/steps.tsx
// component=Steps

import figma from "figma"

const size = figma.selectedInstance.getEnum("size", {
  sm: "sm",
  md: "md",
  lg: "lg",
})
const orientation = figma.selectedInstance.getEnum("orientation", {
  horizontal: "horizontal",
  vertical: "vertical",
})

export default {
  id: "Steps",
  imports: ['import { Steps } from "@libs/ui/molecules/steps"'],
  example: figma.tsx`<Steps count={3} defaultStep={0}${figma.helpers.react.renderProp(
    "orientation",
    orientation,
  )}${figma.helpers.react.renderProp("size", size)}>
        <Steps.List>
          <Steps.Item index={0}>
            <Steps.Trigger>Step 1</Steps.Trigger>
          </Steps.Item>
        </Steps.List>
      </Steps>`,
  metadata: { nestable: true },
}
