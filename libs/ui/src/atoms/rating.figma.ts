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
const value = figma.selectedInstance.getString("value")
const count = figma.selectedInstance.getString("count")
// "Label" is a plain text layer on Rating, not a nested instance
const labelLayer = figma.selectedInstance.findText("Label")
const labelText =
  labelLayer.type !== "ERROR" ? labelLayer.textContent : undefined

export default {
  id: "Rating",
  imports: ['import { Rating } from "@techsio/ui-kit/atoms/rating"'],
  example: figma.code`<Rating${figma.helpers.react.renderProp(
    "allowHalf",
    allowHalf
  )} count={${count}} defaultValue={${value}}${figma.helpers.react.renderProp(
    "dir",
    dir
  )}${figma.helpers.react.renderProp(
    "disabled",
    disabled
  )}${figma.helpers.react.renderProp(
    "labelText",
    labelText
  )}${figma.helpers.react.renderProp("size", size)}/>`,
  metadata: { nestable: true },
}
