// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-30598
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/molecules/popover.tsx
// component=Popover

import figma from "figma"

// Popover carries no `placement` property — placement lives on the separate
// "Popover/Placement" set, so it is not derivable from this instance.
const size = figma.selectedInstance.getEnum("size", {
  sm: "sm",
  md: "md",
  lg: "lg",
})
const border = figma.selectedInstance.getEnum("border", {
  true: true,
  false: false,
})
const shadow = figma.selectedInstance.getEnum("shadow", {
  true: true,
  false: false,
})
const showArrow = figma.selectedInstance.getEnum("showArrow", {
  true: true,
  false: false,
})
const modal = figma.selectedInstance.getBoolean("modal")
const trigger = figma.selectedInstance.getString("trigger")
const title = figma.selectedInstance.getString("title")
const description = figma.selectedInstance.getString("description")
const children = figma.selectedInstance.getString("children")

export default {
  id: "Popover",
  imports: ['import { Popover } from "@techsio/ui-kit/molecules/popover"'],
  example: figma.tsx`<Popover${figma.helpers.react.renderProp(
    "border",
    border
  )} defaultOpen id="popover"${figma.helpers.react.renderProp(
    "modal",
    modal
  )}${figma.helpers.react.renderProp(
    "shadow",
    shadow
  )}${figma.helpers.react.renderProp("size", size)}>
        <Popover.Trigger>${figma.helpers.react.renderChildren(
          trigger
        )}</Popover.Trigger>
        <Popover.Positioner>
          <Popover.Content>
            ${showArrow ? figma.tsx`<Popover.Arrow />` : ""}
            <Popover.Title>${figma.helpers.react.renderChildren(
              title
            )}</Popover.Title>
            <Popover.Description>${figma.helpers.react.renderChildren(
              description
            )}</Popover.Description>
            ${figma.helpers.react.renderChildren(children)}
          </Popover.Content>
        </Popover.Positioner>
      </Popover>`,
  metadata: { nestable: true },
}
