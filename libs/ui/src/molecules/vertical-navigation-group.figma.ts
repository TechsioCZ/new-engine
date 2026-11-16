// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=3539-86
// source=https://github.com/TechsioCZ/new-engine/blob/master/libs/ui/src/molecules/vertical-navigation.tsx
// component=VerticalNavigation.Group

import figma from "figma"

const instance = figma.selectedInstance
const label = instance.getString("label")
const appearance = instance.getEnum("appearance", {
  plain: "plain",
  subtle: "subtle",
  solid: "solid",
})
const severity = instance.getEnum("severity", {
  primary: "primary",
  secondary: "secondary",
})
const items = instance.getSlot("items")

export default {
  id: "VerticalNavigation.Group",
  imports: [
    'import { VerticalNavigation } from "@techsio/ui-kit/molecules/vertical-navigation"',
  ],
  example: figma.code`<VerticalNavigation.Group appearance="${appearance}" severity="${severity}"><VerticalNavigation.GroupLabel>${label}</VerticalNavigation.GroupLabel><VerticalNavigation.List>${items}</VerticalNavigation.List></VerticalNavigation.Group>`,
  metadata: { nestable: true },
}
