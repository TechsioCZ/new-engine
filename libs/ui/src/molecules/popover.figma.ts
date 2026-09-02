// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-30598
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/molecules/popover.tsx
// component=Popover

import figma from "figma"

const placement = figma.selectedInstance.getEnum("placement", {
  top: "top",
  right: "right",
  bottom: "bottom",
  left: "left",
  "top-start": "top-start",
  "top-end": "top-end",
  "bottom-start": "bottom-start",
  "bottom-end": "bottom-end",
})

export default {
  id: "Popover",
  imports: ['import { Popover } from "@libs/ui/molecules/popover"'],
  example: figma.tsx`<Popover defaultOpen id="popover"${figma.helpers.react.renderProp(
    "placement",
    placement,
  )}>
        <Popover.Trigger>Open</Popover.Trigger>
        <Popover.Positioner>
          <Popover.Content>
            <Popover.Arrow />
            Popover content
          </Popover.Content>
        </Popover.Positioner>
      </Popover>`,
  metadata: { nestable: true },
}
