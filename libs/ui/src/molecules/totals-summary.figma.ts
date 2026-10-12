// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=3899-92
// source=https://github.com/TechsioCZ/new-engine/blob/feat/ui-kit-cart-presentation/libs/ui/src/molecules/totals-summary.tsx
// component=TotalsSummary

import figma from "figma"

const instance = figma.selectedInstance
const pending = instance.getEnum("pending", { false: false, true: true })
const pendingLabel = instance.getString("pendingLabel")
const totalLabel = instance.getString("totalLabel")
const totalValue = instance.getString("totalValue")
// Figma row helpers represent data, rather than a React component or JSX slot.
const rows = instance
  .findLayers((node) => node.type === "INSTANCE" && node.name === "Row", {
    path: ["List", "rows"],
  })
  .filter((node) => node.type === "INSTANCE")
  .map((row, index) => ({
    id: `row-${index + 1}`,
    label: row.getString("label"),
    value: row.getString("value"),
    emphasis: row.getEnum("emphasis", {
      default: "default",
      discount: "discount",
    }),
    note: row.getBoolean("showNote") ? row.getString("note") : undefined,
  }))
const footer = instance.getBoolean("showFooter")
  ? instance.getSlot("footer")
  : []
const actions = instance.getBoolean("showActions")
  ? instance.getSlot("actions")
  : []

export default {
  id: "TotalsSummary",
  imports: [
    'import { TotalsSummary } from "@techsio/ui-kit/molecules/totals-summary"',
  ],
  example: figma.code`<TotalsSummary
  rows={${JSON.stringify(rows, null, 2)}}${figma.helpers.react.renderProp("totalLabel", totalLabel)}${figma.helpers.react.renderProp("totalValue", totalValue)}${pending ? figma.code` pending={true}${figma.helpers.react.renderProp("pendingLabel", pendingLabel)}` : ""}${footer?.length ? figma.code` footer={<>${footer}</>}` : ""}${actions?.length ? figma.code` actions={<>${actions}</>}` : ""}
/>`,
  metadata: { nestable: false },
}
