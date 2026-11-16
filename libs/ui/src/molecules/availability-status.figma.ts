// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=3839-105
// source=https://github.com/TechsioCZ/new-engine/blob/master/libs/ui/src/molecules/availability-status.tsx
// component=AvailabilityStatus

import figma from "figma"

const instance = figma.selectedInstance
const status = instance.getEnum("status", {
  available: "available",
  limited: "limited",
  preorder: "preorder",
  unavailable: "unavailable",
  unknown: "unknown",
  pending: "pending",
})
const label = instance.getString("label")
const detail = instance.getBoolean("showDetail")
  ? instance.getString("detail")
  : undefined
// showIcon defaults to true in code, so only the hidden case is rendered.
const showIcon = instance.getBoolean("showIcon") ? undefined : false

export default {
  id: "AvailabilityStatus",
  imports: [
    'import { AvailabilityStatus } from "@techsio/ui-kit/molecules/availability-status"',
  ],
  // Pending has no visible text in Figma; the code needs a screen-reader label.
  example:
    status === "pending"
      ? figma.code`<AvailabilityStatus status="pending" pendingLabel="Načítání dostupnosti" />`
      : figma.code`<AvailabilityStatus${figma.helpers.react.renderProp(
          "status",
          status
        )}${figma.helpers.react.renderProp("label", label)}${figma.helpers.react.renderProp(
          "detail",
          detail
        )}${figma.helpers.react.renderProp("showIcon", showIcon)} />`,
  metadata: { nestable: true },
}
