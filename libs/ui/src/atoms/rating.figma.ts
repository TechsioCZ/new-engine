// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-14985
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/atoms/rating.tsx
// component=Rating

import figma from "figma"

const size = figma.selectedInstance.getEnum("size", {
  sm: "sm",
  md: "md",
  lg: "lg",
})
const disabled = figma.selectedInstance.getEnum("disabled", {
  true: true,
  false: false,
})
const dir = figma.selectedInstance.getEnum("dir", {
  ltr: "ltr",
  rtl: "rtl",
})
const allowHalf = figma.selectedInstance.getBoolean("allowHalf")
const labelText = (function () {
  const nestedLayer0 = figma.selectedInstance.findInstance("Label")
  return {
    text:
      nestedLayer0.type !== "ERROR"
        ? nestedLayer0.getString("text")
        : undefined,
  }
})()

export default {
  id: "Rating",
  imports: ['import { Rating } from "@techsio/ui-kit/atoms/rating"'],
  example: figma.tsx`<Rating${figma.helpers.react.renderProp(
    "allowHalf",
    allowHalf,
  )} count={Number(count)} defaultValue={Number(value)}${figma.helpers.react.renderProp(
    "dir",
    dir,
  )}${figma.helpers.react.renderProp(
    "disabled",
    disabled,
  )}${figma.helpers.react.renderProp(
    "labelText",
    labelText.text,
  )}${figma.helpers.react.renderProp("size", size)}/>`,
  metadata: { nestable: true },
}
