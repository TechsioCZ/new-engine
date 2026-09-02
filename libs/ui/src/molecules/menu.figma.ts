// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-35079
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/molecules/menu.tsx
// component=Menu

import figma from "figma"

const size = figma.selectedInstance.getEnum("size", {
  sm: "sm",
  md: "md",
  lg: "lg",
})

export default {
  id: "Menu",
  imports: ['import { Menu } from "@libs/ui/molecules/menu"'],
  example: figma.tsx`<Menu items={[{ type: "action", value: "item-1", label: "Item 1" }]}${figma.helpers.react.renderProp(
    "size",
    size,
  )} triggerText="Open"/>`,
  metadata: { nestable: true },
}
