// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-16792
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/atoms/skeleton.tsx
// component=Skeleton.Text

import figma from "figma"

const variant = figma.selectedInstance.getEnum("variant", {
  primary: "primary",
  secondary: "secondary",
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
const noOfLines = figma.selectedInstance.getEnum("noOfLines", {
  "1": 1,
  "3": 3,
  "5": 5,
})
const lastLineWidth = figma.selectedInstance.getEnum("lastLineWidth", {
  "60%": "60%",
  "80%": "80%",
  "90%": "90%",
})

export default {
  id: "Skeleton.Text",
  imports: ['import { Skeleton } from "@techsio/ui-kit/atoms/skeleton"'],
  example: figma.tsx`function Example() {
    const placeholderBgClass = placeholderBgClassByVariant[variant];
    return (<Skeleton.Text${figma.helpers.react.renderProp(
      "lastLineWidth",
      lastLineWidth,
    )}${figma.helpers.react.renderProp(
    "noOfLines",
    noOfLines,
  )}${figma.helpers.react.renderProp(
    "size",
    size,
  )}${figma.helpers.react.renderProp(
    "speed",
    speed,
  )}${figma.helpers.react.renderProp("variant", variant)}>
          <div className="w-xs space-y-150">
            <div className={\`h-4 w-full rounded-sm ${placeholderBgClass}\`}/>
            <div className={\`h-4 w-4/5 rounded-sm ${placeholderBgClass}\`}/>
          </div>
        </Skeleton.Text>);
}`,
  metadata: { nestable: false },
}
