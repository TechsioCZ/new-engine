// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=3900-594
// source=https://github.com/TechsioCZ/new-engine/blob/master/libs/ui/src/organisms/line-item.tsx
// component=LineItem

import figma from "figma"

const instance = figma.selectedInstance
const title = instance.getString("title")
const layout = instance.getEnum("layout", {
  default: "default",
  compact: "compact",
})
const readOnly = instance.getEnum("readOnly", { false: false, true: true })
const pending = instance.getEnum("pending", { false: false, true: true })
const pendingLabel = instance.getString("pendingLabel")
const readOnlyLabel = instance.getString("readOnlyLabel")
const image = instance.getBoolean("showImage") ? instance.getSlot("Image") : []
const price = instance.getBoolean("showPrice") ? instance.getSlot("Price") : []
const options = instance.getBoolean("showOptions")
  ? instance.getString("options")
  : undefined
const feedback = instance.getBoolean("showFeedback")
  ? instance.getSlot("Feedback")
  : []
const quantity = instance.getSlot("Quantity")
const actions = instance.getSlot("Actions")

export default {
  id: "LineItem",
  imports: ['import { LineItem } from "@techsio/ui-kit/organisms/line-item"'],
  example: figma.code`<LineItem${figma.helpers.react.renderProp("title", title)}${figma.helpers.react.renderProp("layout", layout)}${figma.helpers.react.renderProp("readOnly", readOnly)}${pending ? figma.code` pending={true}${figma.helpers.react.renderProp("pendingLabel", pendingLabel)}` : ""}>
  ${image?.length ? figma.code`<LineItem.Image>${image}</LineItem.Image>` : ""}
  <LineItem.Body>
    <LineItem.Heading>
      <LineItem.Title />
      ${price?.length ? figma.code`<LineItem.Price>${price}</LineItem.Price>` : ""}
    </LineItem.Heading>
    ${options === undefined ? "" : figma.code`<LineItem.Options>{${JSON.stringify(options)}}</LineItem.Options>`}
    ${feedback}
    <LineItem.Controls>
      <LineItem.Quantity${figma.helpers.react.renderProp("readOnlyLabel", readOnlyLabel)}>${quantity}</LineItem.Quantity>
      ${!readOnly && actions?.length ? figma.code`<LineItem.Actions>${actions}</LineItem.Actions>` : ""}
    </LineItem.Controls>
  </LineItem.Body>
</LineItem>`,
  metadata: { nestable: false },
}
