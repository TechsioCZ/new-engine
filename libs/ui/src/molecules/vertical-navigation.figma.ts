// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=3539-102
// source=https://github.com/TechsioCZ/new-engine/blob/master/libs/ui/src/molecules/vertical-navigation.tsx
// component=VerticalNavigation

import figma from "figma"

const instance = figma.selectedInstance
const size = instance.getEnum("size", { sm: "sm", md: "md" })
const items = instance.getSlot("items")

export default {
  id: "VerticalNavigation",
  imports: [
    'import { VerticalNavigation } from "@techsio/ui-kit/molecules/vertical-navigation"',
  ],
  example: figma.code`<VerticalNavigation size="${size}">${items}</VerticalNavigation>`,
  metadata: { nestable: true },
}
