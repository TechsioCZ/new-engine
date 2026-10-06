// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=3534-18864
// source=https://github.com/TechsioCZ/new-engine/blob/master/libs/ui/src/molecules/vertical-navigation.tsx
// component=VerticalNavigation.BranchContent

import figma from "figma"

const instance = figma.selectedInstance
const tone = instance.getEnum("tone", {
  plain: "plain",
  subtle: "subtle",
  accent: "accent",
})
const variant = instance.getEnum("variant", {
  primary: "primary",
  secondary: "secondary",
})
const indent = instance.getEnum("indent", { false: false, true: true })
const showGuide = instance.getEnum("showGuide", { false: false, true: true })
const items = instance.getSlot("items")

export default {
  id: "VerticalNavigation.BranchContent",
  imports: [
    'import { VerticalNavigation } from "@techsio/ui-kit/molecules/vertical-navigation"',
  ],
  example: figma.code`<VerticalNavigation.BranchContent tone="${tone}" variant="${variant}"${figma.helpers.react.renderProp("indent", indent)}${figma.helpers.react.renderProp("showGuide", showGuide)}><VerticalNavigation.List>${items}</VerticalNavigation.List></VerticalNavigation.BranchContent>`,
  metadata: { nestable: true },
}
