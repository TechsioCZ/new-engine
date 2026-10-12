// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=3838-68
// source=https://github.com/TechsioCZ/new-engine/blob/master/libs/ui/src/molecules/price-block.tsx
// component=PriceBlock

import figma from "figma"

const instance = figma.selectedInstance
const state = instance.getEnum("state", {
  known: "known",
  from: "from",
  discounted: "discounted",
  "on-request": "on-request",
  pending: "pending",
})
const amountLabel = instance.getString("amountLabel")
const taxLabel = instance.getBoolean("showTaxLabel")
  ? instance.getString("taxLabel")
  : undefined
const unitLabel = instance.getBoolean("showUnitLabel")
  ? instance.getString("unitLabel")
  : undefined
const prefix = instance.getString("prefix")
const originalLabel = instance.getString("originalLabel")
const label = instance.getString("label")
const detail = instance.getBoolean("showDetail")
  ? instance.getString("detail")
  : undefined

// The discount badge is a nested Badge instance with a plain "Label" layer.
function discountText() {
  if (!instance.getBoolean("showDiscountLabel")) {
    return
  }
  const badge = instance.findInstance("Badge · discountLabel")
  if (badge.type !== "INSTANCE") {
    return
  }
  const layer = badge.findText("Label")
  return layer.type === "TEXT" ? layer.textContent : undefined
}

const metadata = figma.code`${figma.helpers.react.renderProp(
  "taxLabel",
  taxLabel
)}${figma.helpers.react.renderProp("unitLabel", unitLabel)}`

function example() {
  switch (state) {
    case "pending":
      return figma.code`<PriceBlock state="pending" pendingLabel="Načítání ceny" />`
    case "on-request":
      return figma.code`<PriceBlock state="on-request"${figma.helpers.react.renderProp(
        "label",
        label
      )}${figma.helpers.react.renderProp("detail", detail)} />`
    case "from":
      return figma.code`<PriceBlock state="from"${figma.helpers.react.renderProp(
        "prefix",
        prefix
      )}${figma.helpers.react.renderProp("amountLabel", amountLabel)}${metadata} />`
    case "discounted":
      return figma.code`<PriceBlock state="discounted"${figma.helpers.react.renderProp(
        "amountLabel",
        amountLabel
      )}${figma.helpers.react.renderProp(
        "originalLabel",
        originalLabel
      )} originalSrLabel="Původní cena"${figma.helpers.react.renderProp(
        "discountLabel",
        discountText()
      )}${metadata} />`
    default:
      return figma.code`<PriceBlock state="known"${figma.helpers.react.renderProp(
        "amountLabel",
        amountLabel
      )}${metadata} />`
  }
}

export default {
  id: "PriceBlock",
  imports: [
    'import { PriceBlock } from "@techsio/ui-kit/molecules/price-block"',
  ],
  example: example(),
  metadata: { nestable: true },
}
