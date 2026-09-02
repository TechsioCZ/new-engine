// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-29317
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/molecules/dialog.tsx
// component=Dialog

import figma from "figma"

const placement = figma.selectedInstance.getEnum("placement", {
  center: "center",
  left: "left",
  right: "right",
  top: "top",
  bottom: "bottom",
})

export default {
  id: "Dialog",
  imports: ['import { Dialog } from "@techsio/ui-kit/molecules/dialog"'],
  example: figma.tsx`<Dialog description="Description"${figma.helpers.react.renderProp(
    "placement",
    placement,
  )} title="Title" triggerText="Open">
        Content
      </Dialog>`,
  metadata: { nestable: true },
}
